+++
title = "Rabbitmq Access Control"
date = 2017-10-30T01:48:14Z
draft = false
tags = ["rabbitmq"]
categories = ["struct"]
+++

# Rabbitmq 权限控制

在rabbitmq中，身份验证和授权是分开的。身份验证用于判断用户是谁，授权用于确定用户能做什么和不能做什么。

## 默认虚拟主机和用户

当服务第一次启动或者检测到数据库梅雨初始化或已经被删除，rabbitmq会初始化一个新的数据库，拥有如下资源：

* 一个虚拟主机`/`
* 一个用户名和密码都为`guest`的用户，拥有`/`虚拟主机的所有权限

建议是删除默认用户或者修改默认用户的密码。`guest`用户默认情况只能通过localhost连接，无法通过远程连接。这可以通过配置文件修改，设置`loopback_users.guest = false`即可。

## 权限工作方式

rabbitmq的权限控制主要分为两层，第一层是虚拟主机的权限，第二层是资源的权限。

## 虚拟主机(Virtual Host)

当客户端连接到服务器，它会指定一个要操作的虚拟主机，第一层权限控制被启用，服务器会检查用户对该虚拟主机是否有权限，没有权限连接会被拒绝。

示例：

首先创建一个用户：

```bash
rabbitmqctl add_user cheon 123
```

这里创建了一个用户cheon，密码为123（如果rabbitmq是集群，那么在集群中一个节点上创建了用户，虚拟主机等，在其他节点上也都会存在。）。刚创建的用户是没有任何权限的。可以确认一下用户的权限：

```bash
root@rabbitmq-node1:/# rabbitmqctl list_user_permissions cheon
Listing permissions for user "cheon" ...

root@rabbitmq-node1:/# rabbitmqctl list_user_permissions guest
Listing permissions for user "guest" ...
/	.*	.*	.*
```

可以看到新用户cheon没有任何权限，guest用户拥有虚拟主机`/`的全部权限。

编写一个简单的脚本，通过用户cheon连接`/`虚拟主机，发送Hello World：

```py
#!/usr/bin/env python

import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.6', 5672, "/", credentials=pika.PlainCredentials('cheon', '123')))
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

执行代码：

```bash
=> ./send.py 
Traceback (most recent call last):
  File "./send.py", line 5, in <module>
    connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.6', 5672, "/", credentials=pika.PlainCredentials('cheon', '123')))
  File "/home/cheon/Docker/python/site-packages/pika/adapters/blocking_connection.py", line 377, in __init__
    self._process_io_for_connection_setup()
  File "/home/cheon/Docker/python/site-packages/pika/adapters/blocking_connection.py", line 417, in _process_io_for_connection_setup
    self._open_error_result.is_ready)
  File "/home/cheon/Docker/python/site-packages/pika/adapters/blocking_connection.py", line 469, in _flush_output
    raise maybe_exception
pika.exceptions.ProbableAccessDeniedError: (530, "NOT_ALLOWED - access to vhost '/' refused for user 'cheon'")
```

可以发现报错是连接不被允许。

现在新建一个虚拟主机`myapp`：

```bash
rabbitmqctl add_vhost myapp
```

然后为cheon添加对`myapp`的所有权限（要注意的是虽然guest是管理员帐号，但默认也没有连接新建虚拟主机的权限）：

```bash
rabbitmqctl set_permissions -p myapp cheon ".*" ".*" ".*"
```

修改发送代码连接的虚拟主机：

```py
connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.6', 5672, "myapp" credentials=pika.PlainCredentials('cheon', '123')))
```

再次运行：

```bash
=> ./send.py 
 [x] Sent 'Helllo World!'
```

可以发现连接成功，消息也发送成功。

## 资源

资源(Resources)例如交换和队列，在特定的虚拟主机中是命名实体。相同的名字在不同的虚拟主机中也代表了不同的资源。当对资源进行操作时，第二层的权限控制被启用。rabbitmq将资源分为配置(configure)，写(write)，读(read)权限。配置操作创建，销毁或修改资源；写操作向资源注入消息；读操作从资源获取消息。

对资源的权限用三个正则表达式表示，每一个代表对应虚拟主机的配置，写和读。用户被授予对所有和正则表达式匹配的资源的权限。为了方便，rabbitmq映射AMQP的默认交换的空名字为`amq.default`。

正则表达式`^$`匹配空字符串，不允许用户对资源进行任何操作。标准的AMQP资源名字以`amq`为前缀。服务器生成的资源名字以`amq.gen`为前缀。例如，`^(amq\.gen.*|amq\.default)$`给予用户服务器生成的资源和默认交换的权限。空字符串`''`是`^$`同义词禁止用户权限。

示例：

先为`guest`用户添加能连接`myapp`虚拟主机的权限，但禁止它操作资源：

```bash
root@rabbitmq-node2:/# rabbitmqctl set_permissions -p myapp guest "" "" ""
Setting permissions for user "guest" in vhost "myapp" ...
```

修改代码以`guest`用户来发送消息：

```py
connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.6', 5672, "myapp", credentials=pika.PlainCredentials('guest', 'guest')))
```

执行代码：

```bash
=> ./send.py 
Traceback (most recent call last):
  File "./send.py", line 8, in <module>
    channel.queue_declare(queue='hello')
  File "/home/cheon/Docker/python/site-packages/pika/adapters/blocking_connection.py", line 2468, in queue_declare
    self._flush_output(declare_ok_result.is_ready)
  File "/home/cheon/Docker/python/site-packages/pika/adapters/blocking_connection.py", line 1292, in _flush_output
    *waiters)
  File "/home/cheon/Docker/python/site-packages/pika/adapters/blocking_connection.py", line 458, in _flush_output
    self._impl.ioloop.poll()
  File "/home/cheon/Docker/python/site-packages/pika/adapters/select_connection.py", line 495, in poll
    self._poller.poll()
  File "/home/cheon/Docker/python/site-packages/pika/adapters/select_connection.py", line 1114, in poll
    self._dispatch_fd_events(fd_event_map)
  File "/home/cheon/Docker/python/site-packages/pika/adapters/select_connection.py", line 831, in _dispatch_fd_events
    handler(fileno, events)
  File "/home/cheon/Docker/python/site-packages/pika/adapters/base_connection.py", line 410, in _handle_events
    self._handle_read()
  File "/home/cheon/Docker/python/site-packages/pika/adapters/base_connection.py", line 464, in _handle_read
    self._on_data_available(data)
  File "/home/cheon/Docker/python/site-packages/pika/connection.py", line 2021, in _on_data_available
    self._process_frame(frame_value)
  File "/home/cheon/Docker/python/site-packages/pika/connection.py", line 2142, in _process_frame
    if self._process_callbacks(frame_value):
  File "/home/cheon/Docker/python/site-packages/pika/connection.py", line 2123, in _process_callbacks
    frame_value)  # Args
  File "/home/cheon/Docker/python/site-packages/pika/callback.py", line 60, in wrapper
    return function(*tuple(args), **kwargs)
  File "/home/cheon/Docker/python/site-packages/pika/callback.py", line 92, in wrapper
    return function(*args, **kwargs)
  File "/home/cheon/Docker/python/site-packages/pika/callback.py", line 236, in process
    callback(*args, **keywords)
  File "/home/cheon/Docker/python/site-packages/pika/adapters/blocking_connection.py", line 1358, in _on_channel_closed
    method.reply_text)
pika.exceptions.ChannelClosed: (403, "ACCESS_REFUSED - access to queue 'hello' in vhost 'myapp' refused for user 'guest'")
```

提示没有操作`hello`队列的权限。现在修改guest的权限，让guest有配置和写的权限：

```bash
rabbitmqctl set_permissions -p myapp guest ".*" ".*" ""
```

再次执行：

```bash
=> ./send.py 
 [x] Sent 'Helllo World!'
```

可以看到发送成功了，再运行消费者去消费：

```py
#!/usr/bin/env python

import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('172.17.0.6', 5672, "myapp", credentials=pika.PlainCredentials('cheon', '123')))
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

这里的消费者用的是另一个用户cheon，因为他有读的权限，而guest没有读的权限，因此无法消费。

```bash
=> ./receive.py 
 [*] Waiting for message. To exit press CTRL+C
 [x] Received b'Hello World!'
```

可以看到消费成功。

如果我们把guest的权限设置成`"hello" "hello" ""`，意味着guest对名为`hello`的交换和队列等资源有配置和写的权限，这样执行代码发送端不会报错，但用消费者去消费是收不到消息的，因为代码里用到了myapp默认的交换`''`，但guest没有设置权限，因此会发送失败。在权限控制的时候要注意这一点。
