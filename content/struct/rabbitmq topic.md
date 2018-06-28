+++
title = "Rabbitmq Topic"
date = 2017-10-29T12:32:52Z
draft = false
tags = ["rabbitmq"]
categories = ["struct"]
+++

# rabbitmq 主题

虽然之前使用了`direct`交换来路由不同级别的日志，但是它无法做到根据设备来路由。在我们的日志系统中，可能不止是想要通过日志级别来订阅，还想通过日志来源订阅。这将会给我们带来更大的灵活性，比如我们可以只监听来自cron的error和来自kern的所有日志。为了达到这个效果，我们可以采用一个更复杂的交换--`topic`。

## Topic exchange

发送给`topic`交换的信息的`routing_key`的属性不能是任意的--它必须是一个单词的列表，通过`.`分隔。单词可以是任意的，但是通常是一些描述信息特征的词语。例如`stock.usd.nyse`，`nyse.vmw`，`quick.orange.rabbit`。你可以设置任意多的词语，只要不超过255字节的限制。

`binding key`也必须是相同的格式。`topic`背后的交换逻辑和`direct`是相似的，一个带有特殊`routing key`的信息会被发送到所有拥有匹配`binding key`的队列，但有两个需要注意的地方：

* `*` 可以代表一个单词
* `#` 可以代表0或多个单词

示例：

![topic example](/struct/images/rabbitmq_topic_img1.png)

在这个示例中，我们发送描述动物的消息。消息会带有由三个单词组成的`routing key`，单词间用`.`分隔，用于描述不同的特征。我们创建了三个绑定：`Q1`和`*.orange.*`绑定，`Q2`和`*.*.rabbit`，`lazy.#`绑定。可以简单得概括为`Q1`只关心所有橙色的动物，`Q2`只关心兔子和慢吞吞的动物。

一条带有`quick.orange.rabbit`的`routing key`的信息会发送给两个队列，`quick.orange.fox`也会发送给两个，`lazy.brown.fox`只发送给`Q2`，`lazy.pink.rabbit`只发送给`Q2`一次，即使它匹配了两个绑定。`quick.brown.fox`不匹配任何绑定所以会被丢弃。如果我们发送的信息带有一个或四个单词，像`orange`，`quick.orange.male.rabbit`之类的，也不匹配任何绑定，也会被丢弃 。但是`lazy.orange.male.rabbit`虽然有四个单词，也匹配`lazy.#`，因为`#`代表0或多个单词，所以会被发送给`Q2`。

`topic`是一个强大的交换，可以实现其他交换的功能。当一个队列绑定`#`，它可以接收所有信息，就像`fanout`交换。当没有使用`*`和`#`，而是指定明确的字符串，就可以表现地像`direct`交换。

## 最终实现

我们假设日志的`routing key`有两个单词`<facility>.<severity>`，那么代码如下：

`emit_log_topic.py`：

```py
#!/usr/bin/env python

import pika
import sys

connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.6', 5672, credentials=pika.PlainCredentials('guest', 'guest')))
channel = connection.channel()

channel.exchange_declare(
        exchange='topic_logs',
        exchange_type='topic'
        )

severity = sys.argv[1] if len(sys.argv) > 2 else 'info'
message = ' '.join(sys.argv[2:]) or 'Hello World!'
channel.basic_publish(
        exchange='topic_logs',
        routing_key=severity,
        body=message
        )
print(" [x] Sent %r:%r" % (severity, message))
connection.close()
```

`receive_logs_topic.py`：

```py
#!/usr/bin/env python

import pika
import sys

connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.6', 5672, credentials=pika.PlainCredentials('guest', 'guest')))
channel = connection.channel()

channel.exchange_declare(
        exchange='topic_logs',
        exchange_type='topic'
        )

result = channel.queue_declare(exclusive=True)
queue_name = result.method.queue

binding_keys = sys.argv[1:]
if not binding_keys:
    sys.stderr.write("Usage: %s [binding_key]...\n" % sys.argv[0])
    sys.exit(1)

for binding_key in binding_keys:
    channel.queue_bind(
            exchange='topic_logs',
            queue=queue_name,
            routing_key=binding_key
            )

print(' [*] Waiting for logs. To exit press CTRL+C')

def callback(ch, method, properties, body):
    print(" [x] %r:%r" % (method.routing_key, body))

channel.basic_consume(
        callback,
        queue=queue_name,
        no_ack=True
        )

channel.start_consuming()
```

接收所有日志：

```bash
./receive_logs_topic.py "#"
```

只接收来自`kern`的日志：

```bash
./receive_logs_topic.py "kern.*"
```

只接收`critical`级别的日志：

```bash
./receive_logs_topic.py "*.critical"
```

也可以创建多个绑定：

```bash
./receive_logs_topic.py "kern.*" "*.critical"
```

发送`routing key`为`kern.critical`的日志：

```bash
./emit_log_topic.py "kern.critical" "A critical kernel error"
```
