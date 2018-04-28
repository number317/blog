+++
title = "Rabbitmq Hello World"
date = 2017-10-26T17:17:47+08:00
draft = false
tags = ["rabbitmq"]
categories = ["struct"]
+++

# Hello World

我们将用Java写两个简单的程序，一个生产者发送一条信息，一个消费者接受并打印信息。图中的"P"指代生产者，"C"指代消费者，中间的盒子指代一个队列——RabbitMQ 的一个消息缓存。

<!--more-->

![Hello World 架构图](/struct/images/rabbitmq_hello_world_img1.png)

生产者Send.java:

```java
import com.rabbitmq.client.ConnectionFactory;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.Channel;

import java.io.IOException;
import java.util.concurrent.TimeoutException;

public class Send {
    private final static String QUEUE_NAME = "hello";

    public static void main(String[] args) throws IOException, TimeoutException {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("localhost");
        factory.setUsername("admin");
        factory.setPassword("admin");
        Connection connection = factory.newConnection();
        Channel channel = connection.createChannel();
        channel.queueDeclare(QUEUE_NAME, false, false, false, null);
        String message = "Hello World!";
        channel.basicPublish("", QUEUE_NAME, null, message.getBytes());
        System.out.println("[x] Sent '" + message + "'");
        channel.close();
        connection.close();
    }
}
```

消费者Recv.java:

```java
import com.rabbitmq.client.*;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.util.concurrent.TimeoutException;

public class Recv {

    private final static String QUEUE_NAME = "hello";

    public static void main(String[] argv) throws IOException, TimeoutException {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("localhost");
        factory.setUsername("admin");
        factory.setPassword("admin");
        Connection connection = factory.newConnection();
        Channel channel = connection.createChannel();

        channel.queueDeclare(QUEUE_NAME, false, false, false, null);
        System.out.println(" [*] Waiting for message. To exit press CTRL+C");

        Consumer consumer = new DefaultConsumer(channel) {
            @Override

            public void handleDelivery(String consumerTag, Envelope envelope,
                                       AMQP.BasicProperties properties, byte[] body) throws UnsupportedEncodingException {
                String message = new String(body, "UTF-8");
                System.out.println(" [x] Received '" + message + "'");
            }
        };

        channel.basicConsume(QUEUE_NAME, true, consumer);
    }
}
```

如果想要查看 RabbitMQ 中有什么队列，队列中有多少信息，可以通过`rabbitmqctl`来查看：

```bash
rabbitmqctl list_queues
```
