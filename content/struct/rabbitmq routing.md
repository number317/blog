+++
title = "Rabbitmq Routing"
date = 2017-10-28T01:26:49Z
draft = false
tags = ["rabbitmq"]
categories = ["struct"]
+++

# Rabbitmq 路由

这里我们将为日志系统增加一个特性--只订阅一部分信息。例如，我们可以将错误信息存入日志文件，将其他信息打印出来。

## 绑定（Bindings）

在日志系统中我们已经使用过绑定，像这样调用代码：

```py
channel.queue_bind(
    exchange=exchange_name,
    queue=queue_name
)
```

一个绑定是交换和队列之间的关系，可以简单地理解为这个队列只对这个交换的信息感兴趣。绑定可以指定额外的`routing_key`参数。为了避免和一个`basic_publish`参数混淆，我们称它`binding key`，可以通过一下方式创建一个带有key的绑定：

```py
channel.queue_bind(
    exchange=exchange_name,
    queue=queue_name,
    routing_key='black'
)
```

`binding key`的含义依赖于交换的类型。`fanout`交换类型会直接忽略这个值。

## Direct exchange

我们之前的日志系统使用`fanout`交换类型，直接将信息广播给所有消费者。现在我们想要扩展它允许根据根据级别来过滤。例如，将错误级别的日志存入磁盘，将普通的日志直接输出而不浪费磁盘空间。为了达到这个目的，这里将使用`direct`交换。`direct`交换的路由算法也比较简单，一个消息只推送到`binding key`和`routing key`匹配的队列，举例如下图：

![direct routing](/struct/images/rabbitmq_routing_img1.png)

在上述例子中可以看到`direct`交换`x`有两个与之绑定的队列。第一个队列的`binding key`是`orange`，第二个队列有两个`binding key`，分别是`black`和`green`。通过这个配置，一个带有`orage`的`routing key`的信息推送到交换后会被路由到队列`Q1`；一个带有`black`或者`green`的`routing key`的信息推送到交换后会被路由到队列`Q2`，其他的信息会被丢弃。

## 多绑定（Muliple bindings）

![multiple bindings](/struct/images/rabbitmq_routing_img2.png)

用相同的`binding key`绑定多个队列完全是可行的。在我们的例子中可以在`x`和`Q1`之间添加一个名为`black`的`binding key`，这样的话，`direct`交换将会表现得像`fanout`并且会将信息广播到所有匹配的队列。一个带有`black`的`routing key`的信息会递送到`Q1`和`Q2`队列。

## 发送日志

我们将使用这个模型来构建日志系统，我们将会发送信息到`direct`交换，我们将会以日志的级别作为`routing key`。首先创建交换：

```py
channel.exchange_declare(
    exchange='direct_logs',
    exchange_type='direct'
    )
```

然后发送消息：

```py
channel.basic_publish(
    exchange='direct_logs',
    routing_key=serverity,
    body=message
)
```

为了简化程序，我们假设日志级别只有`info`，`warning`，`error`三种情况。

## 订阅

我们将为每一个需要的日志级别创建一个新的绑定：

```py
result = channel.queue_declare(exclusive=True)
queue_name = result.method.queue

for severity in severities:
    channel.queue_bind(
        exchange='direct_logs',
        queue=queue_name,
        routing_key=severity
        )
```

## 最终结果

![multiple bindings](/struct/images/rabbitmq_routing_img3.png)

`emit_log_direct.py`：

```py
#!/usr/bin/env python

import pika
import sys

connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.6', 5672, credentials=pika.PlainCredentials('guest', 'guest')))
channel = connection.channel()

channel.exchange_declare(
        exchange='direct_logs',
        exchange_type='direct'
        )

severity = sys.argv[1] if len(sys.argv) > 2 else 'info'
message = ' '.join(sys.argv[2:]) or 'Hello World!'
channel.basic_publish(
        exchange='direct_logs',
        routing_key=severity,
        body=message
        )
print(" [x] Sent %r:%r" % (severity, message))
connection.close()
```

`receive_logs_direct.py`：

```py
#!/usr/bin/env python

import pika
import sys

connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.6', 5672, credentials=pika.PlainCredentials('guest', 'guest')))
channel = connection.channel()

channel.exchange_declare(
        exchange='direct_logs',
        exchange_type='direct'
        )

result = channel.queue_declare(exclusive=True)
queue_name = result.method.queue

severities = sys.argv[1:]
if not severities:
    sys.stderr.write("Usage: %s [info] [warning] [error]\n" % sys.argv[0])
    sys.exit(1)

for severity in severities:
    channel.queue_bind(
            exchange='direct_logs',
            queue=queue_name,
            routing_key=severity
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

如果只想要保存`warning`和`error`的日志信息到文件中，只需运行：

```bash
./receive_logs_direct.py warning error > logs_from_rabbit.log
```

发送`error`级别的日志：

```bash
./emit_log_direct.py error "Run. Run. Or it will explode"
```
