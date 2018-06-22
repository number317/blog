+++
title = "Rabbitmq Hello World"
date = 2017-10-26T17:17:47+08:00
draft = false
tags = ["rabbitmq"]
categories = ["struct"]
+++

# Hello World

我们将用python写两个简单的程序，一个生产者发送一条信息，一个消费者接受并打印信息。图中的"P"指代生产者，"C"指代消费者，中间的盒子指代一个队列——RabbitMQ 的一个消息缓存。

<!--more-->

![Hello World 架构图](/struct/images/rabbitmq_hello_world_img1.png)

生产者send.py:

```python
#!/usr/bin/env python

import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.2', credentials=pika.PlainCredentials('guest', 'guest')))
channel = connection.channel()

channel.queue_declare(queue='hello')

channel.basic_publish(
        exchange='',
        routing_key='hello',
        body='Hello World!'
        )

print(" [x] Sent 'Helllo World!'")

connection.close()
```

消费者receive.py:

```python
#!/usr/bin/env python

import pika


connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.2', credentials=pika.PlainCredentials('guest', 'guest')))
channel = connection.channel()

channel.queue_declare(queue='hello')

def callback(ch, method, properties, body):
    print(" [x] Received %r" % body)

channel.basic_consume(
        callback,
        queue='hello',
        no_ack=True
        )

print(' [*] Waiting for message. To exit press CTRL+C')
channel.start_consuming()
```

如果想要查看 RabbitMQ 中有什么队列，队列中有多少信息，可以通过`rabbitmqctl`来查看：

```bash
rabbitmqctl list_queues
```
