+++
title = "Rabbitmq Study"
date = 2017-10-26T16:28:26+08:00
draft = false
tags = ["rabbitmq"]
categories = ["struct"]
+++

# RabbitMQ docker 运行

```bash
docker run -d -p 15672:15672 -p 5672:5672 --hostname rabbit --name rabbit -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=admin rabbitmq:3-management
```

<!--more-->

- 5672端口：RabbitMQ 的端口
- 15672端口：RabbitMQ web 端管理工具的端口
- RABBITMQ_DEFAULT_USER：RabbitMQ 登录的用户名
- RABBITMQ_DEFAULT_PASS：RabbitMQ 登录的密码

启动成功后，访问`localhost:15672`即可访问管理界面

![RabbitMQ 管理界面](/struct/images/rabbitmq_study_img1.png)
