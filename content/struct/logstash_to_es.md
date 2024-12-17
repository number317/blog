+++
title = "Logstash to ES"
date = 2019-07-04T09:26:33+08:00
draft = false
tags = ["log", "es"]
categories = ["struct"]
+++

# logstash 配置日志发送 ES

日志收集的架构如下所示:

```
┌────────────┐
│Java logback│\
└────────────┘ \
                  ┌─────┐      ┌────────┐      ┌──────┐      ┌────────┐
                  │kafka│ ───> │logstash│ ───> │  ES  │ ───> │ kibana │
                  └─────┘      └────────┘      └──────┘      └────────┘
┌────────────┐ /
│Java logback│/
└────────────┘
```

java 应用日志通过 logback 发送给 kafka，logstash 从 kafka 消费日志，并将日志转发给 ES。一开始一个应用一个 kafka topic，logstash 消费了之后根据 topic 来确定 ES 的索引。

logback 的配置:

<details>
<summary>logback.xml</summary>

```xml
<appender name="KAFKA" class="com.github.danielwegener.logback.kafka.KafkaAppender">
  <encoder class="ch.qos.logback.classic.encoder.PatternLayoutEncoder"  charset="UTF-8" >
      <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{50} - %msg%n</pattern>
  </encoder>
  <topic>spring-boot-demo</topic>
  <keyingStrategy class="com.github.danielwegener.logback.kafka.keying.NoKeyKeyingStrategy"/>
  <deliveryStrategy class="com.github.danielwegener.logback.kafka.delivery.AsynchronousDeliveryStrategy"/>
  <producerConfig>bootstrap.servers=192.168.0.107:9092</producerConfig>
　 　　<producerConfig>retries=1</producerConfig>
　 　　<producerConfig>batch-size=16384</producerConfig>
　 　　<producerConfig>buffer-memory=33554432</producerConfig>
　 　　<producerConfig>properties.max.request.size==2097152</producerConfig>
</appender>
<logger name="com.cheon.demo" level="INFO" additivity="false">
    <appender-ref ref="KAFKA" />
</logger>
```
</details>

pom 文件依赖:

```xml
<dependency>
  <groupId>com.github.danielwegener</groupId>
  <artifactId>logback-kafka-appender</artifactId>
  <version>0.2.0-RC2</version>
</dependency>
```

logstash 配置:

<details>
<summary>logstash.conf</summary>

```conf
input {
    kafka {
        id => "spring-boot-demo"
        bootstrap_servers => "192.168.0.107:9092"
        group_id => "spring-boot-demo"
        topics_pattern => "spring-boot-demo"
        consumer_threads => 3
        decorate_events => true
        auto_offset_reset => "earliest"
    }
}

filter {
    ruby {
        code => "event.set('timestamp', event.get('@timestamp').time.localtime)"
    }
    ruby {
        code => "event.set('@timestamp', event.get('timestamp'))"
    }

    mutate {
        remove_field => ["timestamp"]
    }
}

output {
    stdout{
    }
    elasticsearch {
       hosts => "http://192.168.0.112:9200"
       index => "%{[@metadata][kafka][topic]}-%{+YYYY-MM-dd}"
    }
}
```
</details>

正常运行了一段时间之后，日志发送 kafka 报错了。查看了才发现是 kafka topic 数量达到限制了。改变方案，将同一项目下应用的日志发送给一个 topic，在日志开头添加索引字段用于区分 ES 索引。

修改后的 logback 的配置:

<details>
<summary>logback.xml</summary>

```xml
<appender name="KAFKA" class="com.github.danielwegener.logback.kafka.KafkaAppender">
  <encoder class="ch.qos.logback.classic.encoder.PatternLayoutEncoder"  charset="UTF-8" >
      <pattern>[spring-app1-demo] %d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{50} - %msg%n</pattern>
  </encoder>
  <topic>spring-boot-demo</topic>
  <keyingStrategy class="com.github.danielwegener.logback.kafka.keying.NoKeyKeyingStrategy"/>
  <deliveryStrategy class="com.github.danielwegener.logback.kafka.delivery.AsynchronousDeliveryStrategy"/>
  <producerConfig>bootstrap.servers=192.168.0.107:9092</producerConfig>
　 　　<producerConfig>retries=1</producerConfig>
　 　　<producerConfig>batch-size=16384</producerConfig>
　 　　<producerConfig>buffer-memory=33554432</producerConfig>
　 　　<producerConfig>properties.max.request.size==2097152</producerConfig>
</appender>
<logger name="com.cheon.demo" level="INFO" additivity="false">
    <appender-ref ref="KAFKA" />
</logger>
```
</details>

配置中 pattern 最开始 `[spring-app1-demo]` 的字段即为用于区分 ES 索引的字段。这一部分内容由 logstash 的 grok 模块正则匹配出来。

修改后的 logstash 配置:

<details>
<summary>logstash.conf</summary>

```conf
input {
    kafka {
        id => "spring-boot-demo"
        bootstrap_servers => "192.168.0.107:9092"
        group_id => "spring-boot-demo"
        topics_pattern => "spring-boot-demo"
        consumer_threads => 3
        decorate_events => true
        auto_offset_reset => "earliest"
    }
}

filter {
    ruby {
        code => "event.set('timestamp', event.get('@timestamp').time.localtime)"
    }
    ruby {
        code => "event.set('@timestamp', event.get('timestamp'))"
    }

    mutate {
        remove_field => ["timestamp"]
    }

    grok {
        match => {
            "message" => "\[(?<index_name>[^ ]*)\]"
        }
    }

}

output {
    stdout{
    }
    elasticsearch {
       hosts => "http://192.168.0.112:9200"
       index => "%{[@metadata][kafka][topic]}-%{index_name}-%{+YYYY-MM-dd}"
    }
}
```
</details>

根据配置可以预测，ES 的索引应为 `spring-boot-demo-spring-app1-demo-2019-07-04`。

运行一段时间后，项目组有新的需求，需要将日志各个字段解析以便于做统计分析。这里就需要修改`grok`的正则。并且由于一个topic中有多个应用的日志，每个应用的日志格式可能不一样，所以可以写多个正则表达式，匹配不到就用下一个正则。测试 grok 正则可以用[grok debugger](grokdebug.herokuapp.com)网站。

最终的配置:

```
input {
    kafka {
        id => "spring-boot-demo"
        bootstrap_servers => "192.168.0.107:9092"
        group_id => "spring-boot-demo"
        topics_pattern => "spring-boot-demo"
        consumer_threads => 3
        decorate_events => true
        auto_offset_reset => "earliest"
    }
}

filter {
    ruby {
        code => "event.set('timestamp', event.get('@timestamp').time.localtime)"
    }
    ruby {
        code => "event.set('@timestamp', event.get('timestamp'))"
    }

    mutate {
        remove_field => ["timestamp"]
    }

    grok {
        match => {
            "message" => ["\[(?<index_name>[A-Za-z\-_0-9]*)\] (?<date>[0-9]{4}-[0-9]{1,2}-[0-9]{1,2} [0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}.[0-9]{3}) (?<level>[A-Z]*) \[[^ ]*\] \- \[[^ ]*\] \[(?<api_id>[^ ]*)\] \[(?<request_addr>[^,]*),(?<request_start>[0-9]*),(?<request_end>[0-9]*),(?<response_time>[0-9]*)\] (?<status>[0-9]*) : (?<request_and_response>.*)","\[(?<index_name>[a-zA-Z\-1-9]*)\]"]
        }
    }

    mutate {
        convert => ["response_time", "integer"]
    }
}

output {
    stdout{
    }
    elasticsearch {
       hosts => "http://192.168.0.112:9200"
       index => "%{[@metadata][kafka][topic]}-%{index_name}-%{+YYYY-MM-dd}"
    }
}
```

注意配置中正则解析结束后还将`response_time`做了数据类型转化，转成了整数类型，便于分析。
