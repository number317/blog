+++
title = "Fluentd Config"
date = 2018-01-05T10:14:58+08:00
draft = false
tags = ["fluentd"]
categories = ["struct"]
+++

# 命令列表

Fluentd配置文件由以下配置文件组成：

1. `source`命令 指明数据输入源
2. `match`命令 指明数据输出源
3. `filter`命令 指明事件处理的管道
4. `system`命令 指明系统级别配置
5. `label`命令 为输出分组并过滤内部路由
6. `include`命令 包含其他文件

# 命令详解

1. `source`: 数据的来源

    Fluentd的输入源通过`source`命令选择和配置想要的输入插件来启用。Fluentd的标准输入插件包括`http`和`forward`。`http`使得Fluentd转变为一个HTTP终端用于接收到来的HTTP信息，而`forward`将fluentd转变为一个TCP终端用于接收TCP包。当然，它们可以被同时启用。

        # Receive events from 24224/tcp
        # This is used by log forwarding and the fluent-cat command
        <source>
          @type forward
          port 24224
        </source>

        # http://this.host:9880/myapp.access?json={"event":"data"}
        <source>
          @type http
          port 9880
        </source>

    每一个`source`命令必须包含一个`type`参数。`type`参数指定使用哪一个输入插件。

2. `match`: 告诉fluentd做什么

    `match`命令寻找匹配标签的事件并且处理它们。`match`命令最常见的用法是将事件输出到其他系统（由于这个原因，这些插件被称为”输出插件“）。Fluentd的标准输出插件包括`file`和`forward`。

        # Receive events from 24224/tcp
        # This is used by log forwarding and the fluent-cat command
        <source>
          @type forward
          port 24224
        </source>

        # http://this.host:9880/myapp.access?json={"event":"data"}
        <source>
          @type http
          port 9880
        </source>

        # Match events tagged with "myapp.access" and
        # store them to /var/log/fluent/access.%Y-%m-%d
        # Of course, you can control how you partition your data
        # with the time_slice_format option.
        <match myapp.access>
          @type file
          path /var/log/fluent/access
        </match>

    每一个`match`命令必须包括一个匹配的样式(match pattern)和一个`type`参数。只有拥有一个和匹配样式(match pattern)匹配的标签的事件才会被送到输出源（在上面的例子中，只有拥有"myapp.access"标签的事件是匹配的）。`type`参数指定了哪个输出插件被使用。

    ## 匹配样式(Match Pattern): 在fluentd中控制事件流

    -----

    以下的匹配样式(match pattern)可以被用于`<match>`标签。

    * `*` 匹配一个单独的标签部分。
        * 例如，`a.*`匹配`a.b`，但是不匹配`a`或者`a.b.c`
    * `**` 匹配0个或多个标签部分。
        * 例如，`a.**`匹配`a`，`a.b`，和`a.b.c`
    * `{X,Y,Z}`匹配X，Y或Z，X，Y和Z是匹配的样式
        * 例如，`{a,b}`匹配`a`和`b`，但是不匹配`c`
        * 这个可以和`*`或`**`结合使用。例如`a.{b,c}.*`和`a.{b,c.**}`
    * 当`<match>`标签列出多个样式时（以一个或多个空格分隔），会匹配任意一个列出的样式。例如：
        * 样式`<match a b>`匹配`a`和`b`
        * 样式`<match a.** b.*>`匹配`a`，`a.b`，`a.b.c`(来自第一个样式)和`b.d`(来自第二个样式)
    

    ## 匹配顺序

    -----

    Fluentd以匹配样式在配置文件中出现的顺序来匹配标签。所以如果有一下配置：

        # ** matches all tags. Bad :(
        <match **>
          @type blackhole_plugin
        </match>
        
        <match myapp.access>
          @type file
          path /var/log/fluent/access
        </match>

    那么`myapp.access`不会被匹配到。大范围的匹配应该定义在小范围匹配的后面。

        <match myapp.access>
          @type file
          path /var/log/fluent/access
        </match>
        
        # Capture all unmatched tags. Good :)
        <match **>
          @type blackhole_plugin
        </match>

    当然，如果使用两个相同的样式，第二个`match`不会被匹配。

    如果想要发送事件到多个输出，可以考虑[out_copy](https://docs.fluentd.org/v1.0/articles/out_copy)插件

3. `filter`: 事件处理管道

    `filter`命令和`match`有相同的语法，但是`filter`可以被链起来用于处理管道。使用过滤器，事件流看起来像下面这样：

        Input -> filter 1 -> ... -> filter N -> Output

    添加一个标准的`record_transformer`过滤器到"match"例子

        # http://this.host:9880/myapp.access?json={"event":"data"}
        <source>
          @type http
          port 9880
        </source>
        
        <filter myapp.access>
          @type record_transformer
          <record>
            host_param "#{Socket.gethostname}"
          </record>
        </filter>
        
        <match myapp.access>
          @type file
          path /var/log/fluent/access
        </match>

    接收到事件，`{"event":"data"}`，首先到`record_transformer`过滤器。`record_transformer`添加"host_param"字段到事件并过滤，`{"event":"data","host_param":"webserver1"}`，到达`file`输出。

    ***过滤器的匹配顺序和输出一样，应该将`<filter>`放在`<match>`之前***

4. `system`: 设置系统级别配置

    以下配置可以通过`system`命令设置。也可以通过fluentd的选项来配置：

    * log_level
    * suppress_repeated_stacktrace
    * emit_error_log_interval
    * suppress_config_dump
    * without_source
    * process_name (只在system命令中有效，无fluentd选项)

    这是一个例子：

        <system>
          # equal to -qq option
          log_level error
          # equal to --without-source option
          without_source
          # ...
        </system>

    ## process_name

    -----

    如果设置了改参数，fluentd的supervisor和worker进程名会被改变。

        <system>
          process_name fluentd1
        </system>

    如果使用这个配置，`ps`命令会显示一下结果：

        % ps aux | grep fluentd1
        foo      45673   0.4  0.2  2523252  38620 s001  S+    7:04AM   0:00.44 worker:fluentd1
        foo      45647   0.0  0.1  2481260  23700 s001  S+    7:04AM   0:00.40 supervisor:fluentd1

    这个特性需要ruby 2.1 及以上版本。

5. `label`: 分组过滤器和输出

    "label"命令为内部路由分组过滤器和输出，降低了处理标签的复杂度。这是一个配置示例，"label"是一个内置插件参数，所以`@`前缀是被需要的。

        <source>
          @type forward
        </source>
        
        <source>
          @type tail
          @label @SYSTEM
        </source>
        
        <filter access.**>
          @type record_transformer
          <record>
            # ...
          </record>
        </filter>
        <match **>
          @type elasticsearch
          # ...
        </match>
        
        <label @SYSTEM>
          <filter var.log.middleware.**>
            @type grep
            # ...
          </filter>
          <match **>
            @type s3
            # ...
          </match>
        </label>

    在这个配置中，`forward`事件被路由到`record_transformer`过滤器`elasticsearch`输出，`in_tail`事件被路由到`@SYSTEM`中的`grep`过滤器`s3`输出。对于没有tag前缀的事件流分割，"label"是有效的。

    ## @ERROR label

    -----

    `@ERROR`标签是一个内置标签，通过`emit_error_event`插件的API用于错误记录的发送。如果在配置文件中设置了`<label @ERROR>`，当发生发送相关的错误时，例如缓存区满了或者非法的记录，事件被路由到这个标签。

6. `@include`: 重新使用你的配置

    在单独配置文件中的命令可以通过`@include`命令导入：

        # Include config files in the ./config.d directory
        @include config.d/*.conf

    `@include`命令支持正则文件路径，通配符，http URL：

        # absolute path
        @include /path/to/config.conf

            # if using a relative path, the directive will use
            # the dirname of this config file to expand the path
        @include extra.conf

            # glob match pattern
        @include config.d/*.conf

            # http
        @include http://example.com/fluent.conf

    注意在通配符中，文件以字母顺序展开。如果有`a.conf`和`b.conf`，fluentd先处理`a.conf`。但是不应该这样写配置文件，应该以更安全的方式写配置：

        # If you have a.conf,b.conf,...,z.conf and a.conf / z.conf are important...

        # This is bad
        @include *.conf
        
        # This is good
        @include a.conf
        @include config.d/*.conf
        @include z.conf

