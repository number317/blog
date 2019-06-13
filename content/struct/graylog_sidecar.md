+++
title = "Graylog Sidecar"
date = 2018-11-14T17:24:04+08:00
draft = false
tags = ["log"]
categories = ["struct"]
+++

# graylog sidecar 部署配置

graylog sidecar 用于配置从文件读取日志，具体读取文件可以采用filebeat和nxlog。这里在debian的容器中部署sidecar来示例。

## 安装sidecar

从[下载页面](https://github.com/Graylog2/collector-sidecar/releases)下载对应的包，这里是debian系统，graylog版本是2.4。所以根据文档，下载`collector-sidecar_0.1.7-1_amd64.deb`：

```bash
curl -OL "https://github.com/Graylog2/collector-sidecar/releases/download/0.1.7/collector-sidecar_0.1.7-1_amd64.deb"
```

下载好后安装：

```bash
dpkg -i collector-sidecar_0.1.7-1_amd64.deb
```

安装好后配置system服务：

```bash
graylog-collector-sidecar -service install
```

这个命令会生成`/etc/init.d/collector-sidecar`脚步，但是在容器中可能systemctl命令执行不了，可以直接执行该脚本。

## 配置sidecar

编辑配置文件`/etc/graylog/collector-sidecar`，改为以下内容：

```conf
server_url: http://graylog.test.com/api/
update_interval: 10
tls_skip_verify: false
send_status: true
list_log_files:
    - /var/log/connect-check/
collector_id: file:/etc/graylog/collector-sidecar/collector-id
cache_path: /var/cache/graylog/collector-sidecar
log_path: /var/log/graylog/collector-sidecar
log_rotation_time: 86400
log_max_age: 604800
tags:
    - connect-check
backends:
    - name: nxlog
      enabled: false
      binary_path: /usr/bin/nxlog
      configuration_path: /etc/graylog/collector-sidecar/generated/nxlog.conf
    - name: filebeat
      enabled: true
      binary_path: /usr/bin/filebeat
      configuration_path: /etc/graylog/collector-sidecar/generated/filebeat.yml
```

主要是修改`server_url`和`tags`两项内容。

## 生存测试日志

编写一个脚本random.sh来生成一些测试日志：

```bash
#!/bin/bash
while true; do
    flag=$RANDOM
    if [[ $flag -le 10923 ]]; then
        echo "Accept 200, connect checkout success." >> /var/log/connect-check/connect-check.log
    elif [[ $flag -gt 10923 && $flag -le 20491 ]]; then
        echo -e "Failed 500, connect checkout failed. Internal Error\n    Check out the code." >> /var/log/connect-check/connect-check.log
    else
        echo -e "Failed 404, connect checkout failed. Connection Not Found\n    Maybe your url is incorrect." >> /var/log/connect-check/connect-check.log
    fi
    interval=$(( $RANDOM%10+1 ))
    sleep ${interval}
done
```

这个脚本会生成多行的日志，用于测试graylog对于多行日志的支持。将脚本放后台执行，持续生成日志：

```bash
nohup ./random.sh &
```

## graylog 配置

1. 在graylog界面上点击`System/Inputs`菜单，创建一个全局的`Beats`输入，配置监听地址`0.0.0.0`，监听端口`5004`

   ![global input](/struct/images/graylog_sidecar_img1.png)

2. 进入`System/Collectors/Manage configurations` 菜单，创建一个新的配置，任意命名为`connect-check`

3. 点击刚刚创建的配置，创建一个`Filebeat`输出，暂时只需要修改`Hosts`的地址，修改为graylog服务器的ip（k8s集群里可以是service的地址）和端口（刚刚创建的全局Beats输入的监听端口）

4. 创建一个`Filebeat`文件输入来收集刚刚脚本生成的测试日志，填写对应的日志路径，配置转发到刚刚创建的filebeat类型的输出。点击启用多行日志的支持，填写多行日志的开头正则表达式，这里是4个空格。在`Additional Fields`项可以配置额外的自定义字段，比如我们可以添加一个字段`app`，值为`connect-check`

5. 为配置添加一个`connect-check`的tag，在tag栏输入tag名，按回车键

   ![configuration tag](/struct/images/graylog_sidecar_img2.png)

## 启动sidecar

执行`/etc/init.d/collector-sidecar start`来启动sidecar，它的日志在`/var/log`目录下，可以查看该目录下的`collector-sidecar.err`文件来检查sidecar的运行状态。

通过日志可以查看到它从graylog获取了新的配置，这个配置就是刚刚在graylog上创建的配置，他们是通过tag来匹配的。现在在graylog的search页面应该可以查看到生成的测试日志了。

## index set 配置

graylog默认的索引集只有一个`Default index set`，查看es的索引也可以看到只有一个`graylog_0`的索引。我们创建一个新的名为connect-check的索引集。

点击`system/indices`，点击`Create index set`，Title, Description, Index prefix都可以写connect-check。其他的选项暂时默认就好。这样就创建好了一个新的索引集。

![index set](/struct/images/graylog_sidecar_img3.png)

## stream 配置

graylog的stream可以实时地将信息转发到不同的分类当中。比如可以将日志级别为`error`的日志转发到一个名为error的stream中。我们创建一个名为connect-check的流，用于接收connect-check的日志。

点击`Stream/Create Stream`，填写Title和Description，Index Set 选择刚刚创建的connect-check。下面还有一个可选项`Remove matches from 'All messages' stream`，如果选择了这一选项，匹配的日志会从`All messages`流中删除。在connect-check流上点击`Manage Rules/Add stream rule`，`Field`填写在input里添加的自定义字段`app`，`Type`选择`match exactly`表示精确匹配，`value`填写`connect-check`，点击`Save`。这样只有connect-check的日志会到这个流里面。

现在点击`Start Stream`，这个流就被启用了。点击这个流可以看到对应的日志数据，但现在整个日志都在一个名为`message`的字段中。

## pipeline 配置

graylog的pipeline可以灵活地配置日志的展现格式，它包含一系列规则，可以关联到多个流。

点击`System/pinpelines/Add new pipeline`，填写pipeline的名字描述。再点击`Manage rules/Create Rule`，添加描述，填写以下规则内容：

```rule
rule "function connect-check"
when
    has_field("message")
then
    let message_field = to_string($message.message);
    let action = grok(pattern: "(?<result>[A-Z][a-z]*) %{NUMBER:return_code}, (?<info>[\\s\\S]*)", value: message_field, only_named_captures: true);
    set_fields(action);
end
```

![rules](/struct/images/graylog_sidecar_img4.png)

这个规则规定了如果找到有`message`字段，就根据正则匹配把`message`字段拆分为`result`, `return_code`, `info`三个字段。

其中的正则匹配可以先在[grokdebug](https://grokdebug.herokuapp.com)(网站可能需要翻墙)先测试通过再应用到rule中。

点击刚刚创建的pipeline，点击`Add new stage`，选择刚刚创建的rules，保存，这样一个pipeline就创建好了。

点击stream，选择connect-check流，可以看到左边导航栏列出了许多日志信息的字段，点击`Fields`旁边的Decorators，选择`Pipeline Processor Decorator`，选择刚刚创建的pipeline，就可以在左边的字段中看到有`result`, `return_code`, `info`三个字段了。这样可以灵活地搜索以及制定告警规则。

![decorators](/struct/images/graylog_sidecar_img5.png)
