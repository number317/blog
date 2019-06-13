+++
title = "Rabbitmq Work Queue"
date = 2017-10-26T19:06:17+08:00
draft = false
tags = ["rabbitmq"]
categories = ["struct"]
+++

# Work Queue

![Work Queue 架构图](/struct/images/rabbitmq_work_queue_img1.png)

工作队列背后的思想是尽量避免立即做资源密集型任务并等待它完成，而是将这些任务放到计划表中，等会儿完成。我们将一个任务封装为一条信息并把它送入一个队列。一个在后台运行的进程将会弹出这些任务并最终执行这个工作。当你运行很多个进程时，任务将会被他们共享。这个概念在web应用中尤为有用，因为在一个简短的HTTP请求中不太可能去处理过于复杂的任务。

<!--more-->

new\_task.py:

```py
#!/usr/bin/env python

import sys
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.6', 5672, credentials=pika.PlainCredentials('guest', 'guest')))
channel = connection.channel()

channel.queue_declare(queue='hello')

message = ' '.join(sys.argv[1:]) or "Hello World"
channel.basic_publish(
        exchange='',
        routing_key='hello',
        body=message
        )
print(" [x] Sent %r" % message)

connection.close()
```

worker.py:

```py
#!/usr/bin/env python

import pika
import time

connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.6', 5672, credentials=pika.PlainCredentials('guest', 'guest')))
channel = connection.channel()

channel.queue_declare(queue='hello')

def callback(ch, method, properties, body):
    print(" [x] Received %r" % body)
    time.sleep(body.count(b'.'))
    print(" [x] Done")

channel.basic_consume(
        callback,
        queue='hello',
        no_ack=True
        )

print(' [*] Waiting for message. To exit press CTRL+C')
channel.start_consuming()
```

## 轮询分派

使用任务队列的其中一个好处是可以很容易的进行并行任务。如果我们有很多任务堆积在一起，那么可以增加更多的工作线程，可以很容易地缩放规模。

首先，同时运行两个worker实例，他们都会从队列中获取信息。然后多次运行newtask，发送多条信息。

运行`new_task.py`使程序一直发送消息：

```bash
=> i=0; while true; do ./new_task.py message-"$i.."; i=$((i+1)); sleep 2; done
 [x] Sent 'message-0..'
 [x] Sent 'message-1..'
 [x] Sent 'message-2..'
 [x] Sent 'message-3..'
 [x] Sent 'message-4..'
 [x] Sent 'message-5..'
 [x] Sent 'message-6..'
 [x] Sent 'message-7..'
```

开启两个worker实例进行消费，可以看到如下结果：

work1:

```bash
=> ./worker.py
 [*] Waiting for message. To exit press CTRL+C
 [x] Received b'message-0..'
 [x] Done
 [x] Received b'message-2..'
 [x] Done
 [x] Received b'message-4..'
 [x] Done
 [x] Received b'message-6..'
 [x] Done
```

work2:

```bash
=> ./worker.py
 [*] Waiting for message. To exit press CTRL+C
 [x] Received b'message-1..'
 [x] Done
 [x] Received b'message-3..'
 [x] Done
 [x] Received b'message-5..'
 [x] Done
 [x] Received b'message-7..'
 [x] Done
```

观察结果可以发现，默认情况下，RabbitMQ 将会逐次发送信息给下一个消费者，第一条信息给第一个消费者，第二条信息给第二个消费者……平均下来，每个消费者会获得同样数目的信息。这种分派的方式称为轮询。

## 信息确认

完成一个任务会花费几秒。你可能想要知道如果其中一个消费者开始一个任务并在做了一部分时中断将会发生什么。以我们目前的代码，一旦 RabbitMQ 递送了一个信息给消费者，它将立即标记这条信息为可删除的。在这种情况下，如果你杀死一个消费者我们会丢失它正在处理的信息。我们也会丢失所有分派给这个消费者但还没有处理的信息。

还是以两个消费者为例：

work1:

```bash
=> ./worker.py
 [*] Waiting for message. To exit press CTRL+C
 [x] Received b'message-0..'
 [x] Done
 [x] Received b'message-2..'
 [x] Done
 [x] Received b'message-4..'
^CTraceback (most recent call last):
  File "./worker.py", line 43, in <module>
    channel.start_consuming()
  File "/home/cheon/Docker/python/site-packages/pika/adapters/blocking_connection.py", line 1822, in start_consuming
    self.connection.process_data_events(time_limit=None)
  File "/home/cheon/Docker/python/site-packages/pika/adapters/blocking_connection.py", line 758, in process_data_events
    self._dispatch_channel_events()
  File "/home/cheon/Docker/python/site-packages/pika/adapters/blocking_connection.py", line 521, in _dispatch_channel_events
    impl_channel._get_cookie()._dispatch_events()
  File "/home/cheon/Docker/python/site-packages/pika/adapters/blocking_connection.py", line 1445, in _dispatch_events
    evt.body)
  File "./worker.py", line 33, in callback
    time.sleep(body.count(b'.'))
KeyboardInterrupt
```

work2:

```bash
=> ./worker.py
 [*] Waiting for message. To exit press CTRL+C
 [x] Received b'message-1..'
 [x] Done
 [x] Received b'message-3..'
 [x] Done
 [x] Received b'message-5..'
 [x] Done
 [x] Received b'message-6..'
 [x] Done
```

在第一个消费者处理message-4的时候将进程杀死，发现message-4直接丢失了，并没有发给另一个消费者。

但我们不想丢失任何任务。如果一个消费者中断，我们希望任务被递送给另一个消费者。为了确保信息不会丢失，RabbitMQ 支持信息确认(message acknoledgments)。一个 ack 被消费者发送给 RabbitMQ 告诉它一条信息已经被接收并处理了，RabbitMQ 可以删除它了。

如果一个消费者中断(它的频道被关闭，连接被关闭，或者TCP连接丢失)并且没有发送一个 ack，RabbitMQ 将会理解为这个信息没有被完全处理好，并且重新队列它。如果此时有其他的消费者在线，它会很快地将信息递送给另一个消费者。这样可以保证没有信息丢失，即使一个消费者意外中断。

手动消息确认(Manual message acknowledgements)默认被打开。在之前的例子例子中，我们通过`autoAck=true`选项来关闭了它。现在设置为手动消息确认（恢复默认设置）并且发送一个消息确认，修改后的消费者代码如下：

```py
#!/usr/bin/env python

import pika
import time

connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.6', 5672, credentials=pika.PlainCredentials('guest', 'guest')))
channel = connection.channel()

channel.queue_declare(queue='hello')

def callback(ch, method, properties, body):
    print(" [x] Received %r" % body)
    time.sleep(body.count(b'.'))
    print(" [x] Done")
    ch.basic_ack(delivery_tag=method.delivery_tag)

channel.basic_consume(
        callback,
        queue='hello'
        )

print(' [*] Waiting for message. To exit press CTRL+C')
channel.start_consuming()
```

依旧使用上面的例子：

work1:

```bash
=> ./worker.py
 [*] Waiting for message. To exit press CTRL+C
 [x] Received b'message-0..'
 [x] Done
 [x] Received b'message-2..'
 [x] Done
 [x] Received b'message-4..'
^CTraceback (most recent call last):
  File "./worker.py", line 43, in <module>
    channel.start_consuming()
  File "/home/cheon/Docker/python/site-packages/pika/adapters/blocking_connection.py", line 1822, in start_consuming
    self.connection.process_data_events(time_limit=None)
  File "/home/cheon/Docker/python/site-packages/pika/adapters/blocking_connection.py", line 758, in process_data_events
    self._dispatch_channel_events()
  File "/home/cheon/Docker/python/site-packages/pika/adapters/blocking_connection.py", line 521, in _dispatch_channel_events
    impl_channel._get_cookie()._dispatch_events()
  File "/home/cheon/Docker/python/site-packages/pika/adapters/blocking_connection.py", line 1445, in _dispatch_events
    evt.body)
  File "./worker.py", line 33, in callback
    time.sleep(body.count(b'.'))
KeyboardInterrupt
```

work2:

```bash
=> ./worker.py
 [*] Waiting for message. To exit press CTRL+C
 [x] Received b'message-1..'
 [x] Done
 [x] Received b'message-3..'
 [x] Done
 [x] Received b'message-4..'
 [x] Done
 [x] Received b'message-5..'
 [x] Done
```

使用这个代码可以确保即使你在一个消费者处理信息时用CTRL+C杀死它，信息也不会丢失。在消费者中断之后，所有未被确认的信息将会被重新递送。

## 忘记确认

忘记`basicAck`是一个常见的错误。这是一个简单的错误，但是后果是严重的。当你的客户端退出，消息会被重新递送，但是 RabbitMQ 会占用越来越多的内存因为它无法释放未被确认的信息。调试这个错误，可以用`rabbitmqctl`打印出`message_unacknowledged`字段：

```bash
rabbitmqctl list_queues name messages_ready messages_unacknowledged
```

## 信息持久化

现在已经确保了消费者中断数据不会丢失，但是当 RabbitMQ 服务器停止，信息仍然会丢失。当 RabbitMQ 退出或者崩溃，默认情况下它会忘记队列和信息。为了保证数据不丢失，需要做两件事：保证队列不丢失，保证队列里的信息不丢失。

首先，需要确保 RabbitMQ 不会丢失队列信息。为了达到这个目的，我们需要声明队列是持久化的：

```py
channel.queue_declare(queue='hello', durable=True)
```

虽然这个命令是正确的，但是它在我们当前的设置中不会生效。因为我们已经定义了一个名为`hello`的非持久化队列，RabbitMQ 不允许用不同的参数重新定义一个已存在的队列，并且会返回一个错误。但是有一个很方便的变通方案，我们可以定义一个名字不同的队列，例如`task_queue`：

```py
channel.queue_declare(queue='task_queue', durable=True)
```

`queue_declare`的改变需要应用到生产者和消费者的代码中。现在我们已经确保`task_queue`队列不会丢失了即使 RabbitMQ 重启。我们还需要标记信息是持久化的——通过设置`delivery_mode`的值为`2`：

```py
channel.basic_publish(
        exchange='',
        routing_key='task_queue',
        body=message,
        properties=pika.BasicProperties(delivery_mode=2)
        )
```

*信息持久化的注意点*

*让信息持久化并不保证信息完全不会丢失，虽然这告诉 RabbitMQ 保存信息到硬盘，但仍然有段短时间 RabbitMQ 已经接收了信息但没有保存它。并且 RabbitMQ 也不会为每一条信息执行同步(fsync)——它可能只是将信息存到缓存中并没有真正地写入硬盘。持久化的保证并不是足够健壮的，但是对于我们这个简单的任务队列是够用了。如果需要更加健壮的保证，可以参阅使用[发布确认(publisher confirms)](https://www.rabbitmq.com/confirms.html)*

## 合理分派

你可能注意到了分派工作并不是像我们预想的那样工作。例如有两个消费者，所有的奇数信息都是大规模的而偶数信息都是轻量的，那么一个消费者会很繁忙而另一个几乎不做任何工作。RabbitMQ 不知道这一点仍然均匀地分派信息。这是因为 RabbitMQ 只是分派进入到队列中的信息，它不查看消费者还有多少未确认的信息，它只是盲目地将第n条信息发送给第n个消费者。

为了改变这一点，我们可以使用`basic.qos`方法的`prefetch_count=1`设置。这个设置告诉 RabbitMQ 不要同时给一个消费者超过一条的信息。换句话说，不要分派一条新的信息给一个消费者直到它处理完并确认了之前的信息。作为代替，RabbitMQ 会分派这条信息给下一个不忙的消费者。

![合理分派](/struct/images/rabbitmq_work_queue_img2.png)

最终的代码如下

new\_task.py:

```py
#!/usr/bin/env python

import sys
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.6', 5672, credentials=pika.PlainCredentials('guest', 'guest')))
channel = connection.channel()

channel.queue_declare(queue='task_queue', durable=True)
channel.basic_qos(prefetch_count=1)

message = ' '.join(sys.argv[1:]) or "Hello World!"
channel.basic_publish(
        exchange='',
        routing_key='task_queue',
        body=message,
        properties=pika.BasicProperties(delivery_mode=2)
        )

print(" [x] Sent %r" % message)
connection.close()
```

worker.py:

```py
#!/usr/bin/env python

import pika
import time

connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.6', 5672, credentials=pika.PlainCredentials('guest', 'guest')))
channel = connection.channel()

channel.queue_declare(queue='task_queue', durable=True)
channel.basic_qos(prefetch_count=1)
print(' [*] Waiting for message. To exit press CTRL+C')

def callback(ch, method, properties, body):
    print(" [x] Received %r" % body)
    time.sleep(body.count(b'.'))
    print(" [x] Done")
    ch.basic_ack(delivery_tag=method.delivery_tag)

channel.basic_qos(prefetch_count=1)
channel.basic_consume(
        callback,
        queue='task_queue'
        )

channel.start_consuming()
```

两个消费者：

work1:

```bash
=> ./worker.py
 [*] Waiting for message. To exit press CTRL+C
 [x] Received b'message-0..'
 [x] Done
 [x] Received b'message-2..'
 [x] Done
 [x] Received b'message-3.......'
 [x] Done
 [x] Received b'message-6..'
 [x] Done
 [x] Received b'message-7.......'
 [x] Done
 [x] Received b'message-10..'
 [x] Done
```

work2:

```bash
=> ./worker.py
 [*] Waiting for message. To exit press CTRL+C
 [x] Received b'message-1.......'
 [x] Done
 [x] Received b'message-4..'
 [x] Done
 [x] Received b'message-5.......'
 [x] Done
 [x] Received b'message-8..'
 [x] Done
 [x] Received b'message-9.......'
 [x] Done
```

使用消息确认和`prefetch_count`可以设置好一个工作队列。持久化选项可以让任务存活即使 RabbitMQ 重启。
