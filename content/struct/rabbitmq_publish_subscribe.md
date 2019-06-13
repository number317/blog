+++
title = "Rabbitmq Publish Subscribe"
date = 2017-10-27T15:18:38+08:00
draft = false
tags = ["rabbitmq"]
categories = ["struct"]
+++

# Publish Subcribe

发布和订阅模式简单而言就是将一个消息发送个多个消费者。为了阐明这个模式，这里将会构建一个简单的日志系统，这个系统由两部分组成，第一个程序发送消息，第二个程序接收和打印消息。

在该日志系统中，接收程序的每一个运行副本都将得到消息，这样我们可以运行一个接收器，并将日志存放在磁盘；同时运行另一个接收器将日志在屏幕上打印出来。

## 交换(Exchanges)

rabbitmq 消息模型的核心是生产者从不直接发送任何消息到队列。事实上，一个生产者经常不知道一个消息是否被发送到了队列。生产者只能将消息发送给交换。交换是一个非常简单的东西，它一边接收来自生产者的消息，另一边它把消息推入消息队列。交换是一定知道要怎么处理它接收到的消息的。应该被追加到一个特定的队列后，还是应该追加到多个队列中，还是应该被丢弃。这些规则都由交换类型（exchange type）定义。

![exchange](/struct/images/rabbitmq_publish_subscribe_img1.png)

有一些可用的交换类型：`direct`, `topic`, `headers` 和 `fanout`，这里将使用最后一个类型--`fanout`。创建一个名为`logs`的该类型交换：

```py
channel.exchange_declare(exchange='logs', exchange_type='fanout')
```

`fanout`类型的交换非常简单。就如它的名字一样，它只是将它接收到的信息广播到它知道的所有队列，这正是我们日志系统所需要的。

## 查看交换

列出服务器上可用的交换可以使用`rabbitmqctl`命令:

```bash
rabbitmqctl list_exchanges
```

在列表中会有一些`amq.*`的交换和默认（未命名）的交换。这些是默认配置的，但是这里目前用不到他们。

有时候我们通过空字符串`''`来使用默认的交换：

```py
channel.basic_publish(exchange='',
                      routing_key='hello',
                      body=message)
```

现在我们可以推送到我们的命名交换中：

```bash
channel.basic_publish(
    exchange='logs'
    routing_key='',
    body=message
    )
```

## 临时队列

有时我们使用的队列有指定的名字，能够为队列命名是至关重要的，我们需要指定工作到相同的队列。当你想要在生产者和消费者间共享队列时为队列命名是很重要的。但是在我们的日志系统中，我们想要监听所有的日志，而不是一些；我们也只对当前流动的信息感兴趣而不是旧的信息。要达到这个效果我们需要两件事。

第一，无论何时连接到rabbitmq我们需要刷新，清空队列。为了做到这个我们可以用随机名字创建一个队列，或者更好的是让服务器为我们选择一个随机的队列名字。可以通过不给`queue`参数到`queue_declare`来做到这一点：

```py
result = channel.queue_declare()
```

这个时候`result.method.queue`包含了一个随机的队列名。例如它可能看起来像`amq.gen-JzTY20BRgKO-HjmUJj0wLg`

第二，一旦消费者连接被关闭，队列应该被删除，有一个`exclusive`标签：

```bash
result = channel.queue_declare(excusive=True)
```

可以在[队列指南](http://www.rabbitmq.com/queues.html)获取更多`exclusive`标签和其他队列属性。

## 绑定（Bindings）

![绑定](/struct/images/rabbitmq_publish_subscribe_img2.png)

我们已经创建了一个`fanout`类型的交换。现在我们需要告诉交换发送信息给我们的队列。交换和队列之间的关系叫做绑定：

```py
channel.queue_bind(exchange='logs', queue=result.method.queue)
```

现在`logs`交换将会追加信息到我们的队列。

## 列出绑定

可以列出当前存在的绑定：

```bash
rabbitmqctl list_bindings
```

最终代码如下

生产者`emit_log.py`：

```py
#!/usr/bin/env python
import pika
import sys

connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.6', 5672, credentials=pika.PlainCredentials('guest', 'guest')))
channel = connection.channel()

channel.exchange_declare(exchange='logs',
                         exchange_type='fanout')

message = ' '.join(sys.argv[1:]) or "info: Hello World!"
channel.basic_publish(exchange='logs',
                      routing_key='',
                      body=message)
print(" [x] Sent %r" % message)
connection.close()
```

消费者`receive_logs.py`：

```py
#!/usr/bin/env python
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.6', 5672, credentials=pika.PlainCredentials('guest', 'guest')))
channel = connection.channel()

channel.exchange_declare(exchange='logs',
                         exchange_type='fanout')

result = channel.queue_declare(exclusive=True)
queue_name = result.method.queue

channel.queue_bind(exchange='logs',
                   queue=queue_name)

print(' [*] Waiting for logs. To exit press CTRL+C')

def callback(ch, method, properties, body):
    print(" [x] %r" % body)

channel.basic_consume(callback,
                      queue=queue_name,
                      no_ack=True)

channel.start_consuming()
```

如果想要保存日志到文件，只要运行如下命令：

```bash
./receive_logs.py > logs_from_rabbit.log
```

如果想要在终端上产看日志，秩序运行：

```bash
./receive_logs.py
```

发送日志：

```bash
python emit_log.py
```
