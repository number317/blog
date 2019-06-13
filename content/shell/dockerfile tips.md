+++
title = "Dockerfile Tips"
date = 2019-06-13T13:51:36+08:00
draft = false
tags = ["docker"]
categories = ["shell"]
+++

# Dockerfile 编写建议

日常编写`Dockerfile`的过程中总结的一些经验:

* 基础镜像尽量选择`alpine`版本，减小镜像体积，如果需要glibc，在`Dockerfile`中添加以下指令

  ```
  RUN apk --no-cache add ca-certificates wget && \
      wget -q -O /etc/apk/keys/sgerrand.rsa.pub https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub && \
      wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.29-r0/glibc-2.29-r0.apk && \
      apk add glibc-2.29-r0.apk
  ```

  关于在`alpine`镜像中安装`glibc`，详情可以参考[github](https://github.com/sgerrand/alpine-pkg-glibc)介绍

* 在`Dockerfile`里需要安装软件的尽量使用国内的源，加快ci构建，常见的操作如下：

  * alpine:

  ```
  RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
  ```

  * centos:

  ```
  RUN curl -o /etc/yum.repos.d/CentOS-Base.repo http://mirrors.aliyun.com/repo/Centos-7.repo
  ```

  * node:

  ```
  RUN npm install --registry=https://registry.npm.taobao.org
  ```

* 构建镜像时如果需要代理，可以配置以下参数：

  ```
  docker build -t imagename . --build-arg HTTP_PROXY=http://ip:port --build-arg HTTPS_PROXY=http://ip:port
  ```

* 镜像设置北京时间，可以安装`tzdata`软件包，再设置`/etc/localtime`:

  ```
  RUN apk add tzdata && ln -sfv /usr/share/zoneinfo/Asia/Shanghai /etc/localtime 
  ```

* 如果容器中文显示乱码，可以在`Dockerfile`中配置`LANG`环境变量:

  ```
  ENV LANG C.UTF-8
  ```
