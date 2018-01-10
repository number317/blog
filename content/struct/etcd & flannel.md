+++
title = "Etcd & Flannel"
date = 2017-11-01T17:58:29+08:00
draft = false
tags = ["etcd","flannel"]
categories = ["struct"]
+++

# etcd & flannel 实现跨主机容器通信

## 准备工作

1. 测试环境：vagrant + centos7.2 虚拟机
2. 主机说明：
    - ip: `192.168.12.101` hostname: `node1` 安装软件：etcd, flannel, docker
    - ip: `192.168.12.102` hostname: `node2` 安装软件：flannel, docker

## 启动虚拟机

vagrant配置文件：

```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure(2) do |config|

    (1..2).each do |i|
        config.vm.define "node#{i}" do |s|
            s.vm.box = "bento/centos-7.2"
            s.vm.hostname = "node#{i}"
            n = 100 + i
            s.vm.network "private_network", ip: "192.168.12.#{n}"
            s.ssh.username = "vagrant"
            s.ssh.password = "vagrant"
            s.ssh.insert_key = false
            s.vm.provider "virtualbox" do |v|
                v.name = "node#{i}"
                v.cpus = 1
                v.memory = 1024
            end
        end
    end
end
```

在该配置文件的目录下执行`vagrant up`启动两台测试用虚拟机

## 通用配置

**以下操作在node1和node2上都需要配置**

1. 关闭，禁用防火墙：

    ```bash
    sudo systemctl stop firewalld
    sudo systemctl disable firewalld
    ```

2. 安装需要软件：

    ```bash
    sudo yum install -y epel-release docker flannel
    ```

## node1 配置

1. 安装etcd：

    ```bash
    sudo yum install -y etcd
    ```

2. 修改etcd的配置文件`/etc/etcd/etcd.conf`为如下内容，修改前可以先备份原来的配置文件：

    ```conf
    ETCD_NAME=master
    ETCD_DATA_DIR="/var/lib/etcd/default.etcd"
    ETCD_LISTEN_CLIENT_URLS="http://0.0.0.0:2379,http://0.0.0.0:4001"
    ETCD_ADVERTISE_CLIENT_URLS="http://192.168.12.101:2379,http://192.168.12.101:4001"
    ```

3. 启动etcd，并设置开机自启动：

    ```bash
    sudo systemctl start etcd
    sudo systemctl enable etcd
    ```

4. 测试etcd状态：

    ```bash
    etcdctl -C http://192.168.12.101:2379 cluster-health
    etcdctl -C http://192.168.12.101:4001 cluster-health
    ```

5. 安装flannel：

    ```bash
    sudo yum -y install flannel
    ```

6. 修改flannel的配置文件`/etc/sysconfig/flanneld`为如下内容，修改前可以先备份原来的配置文件：

    ```conf
    FLANNEL_ETCD="http://192.168.12.101:2379"
    FLANNEL_ETCD_KEY="/atomic.io/network"
    FLANNEL_OPTIONS="--iface=enp0s8"
    ```

    注意，配置文件里的`--iface=enp0s8`配置的是网卡，可以用`ip addr`命令查看，如果不配置网卡，可能会给不同主机的容器分配相同的ip地址

7. 在etcd中设置flannel的key，用来保证多个flannel实例间的配置一致性：

    ```bash
    etcdctl mk /atomic.io/network/config '{"Network": "192.168.0.0/16"}'
    ```
    设置的key要和flannel配置的相同。`Network`后的ip地址可以任意设定网段，容器ip会根据该网段自动分配。

8. 启动flannel，重启docker，使flannel分配的ip生效：

    ```bash
    sudo systemctl start flannel
    sudo systemctl enable flannel
    sudo systemctl restart docker
    ```

## node2 配置

1. 修改flannel的配置文件`/etc/sysconfig/flanneld`为如下内容，修改前可以先备份原来的配置文件：

    ```conf
    FLANNEL_ETCD="http://192.168.12.101:2379"
    FLANNEL_ETCD_KEY="/atomic.io/network"
    FLANNEL_OPTIONS="--iface=enp0s8"
    ```

    注意，配置文件里的`--iface=enp0s8`配置的是网卡，可以用`ip addr`命令查看，如果不配置网卡，可能会给不同主机的容器分配相同的ip地址

2. 启动flannel，重启docker，使flannel分配的ip生效：

    ```bash
    sudo systemctl start flannel
    sudo systemctl enable flannel
    sudo systemctl restart docker
    ```

## 启动容器进行测试

1. 在node1和node2中分别运行一个容器：

    ```bash
    sudo docker run -it ubuntu:14.04
    ```

2. 在两个容器中互相ping对方ip，如果配置成功，则应该能ping通。否则请检查配置是否有错误，尤其是flannel配置网卡。
    
