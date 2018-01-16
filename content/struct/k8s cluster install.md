+++
title = "K8s Cluster Install"
date = 2017-12-04T09:19:26+08:00
draft = false
tags = ["k8s"]
categories = ["struct"]
+++

# vagrant kubernetes 集群安装

## 集群说明

集群共有四个节点，一个master节点，四个子节点，其中一个节点即是master节点，也是node节点，系统均为centos-7.2。

```conf
k8s-node1      192.168.12.81       master, node
k8s-node2      192.168.12.82       node
k8s-node3      192.168.12.83       node
k8s-node4      192.168.12.84       node
```

## vagrant 配置

vagrant的box可选用bento/centos-7.2，以下是Vagrantfile:

```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :

# All Vagrant configuration is done below. The "2" in Vagrant.configure
# configures the configuration version (we support older styles for
# backwards compatibility). Please don't change it unless you know what
# you're doing.
Vagrant.configure("2") do |config|
    (1..4).each do |i|
        config.vm.define "k8s-node#{i}" do |node|
            file_to_disk = "tmp/k8s_node#{i}_disk.vdi"
            node.vm.box = "centos-7.2"
            node.vm.hostname = "k8s-node#{i}"
            n = 80 +i
            node.vm.network "private_network", ip: "192.168.12.#{n}"
            node.vm.provider "virtualbox" do |vb|
                vb.name = "k8s-node#{i}"
                vb.cpus = 2
                vb.memory = 1024
            end
            node.vm.provision "ansible" do |ansible|
                ansible.playbook = "playbook.yml"
                ansible.groups = {
                "master" => ["k8s-node1"],
                "nodes" => (1..4).map {|j| "k8s-node#{j}"},
            }
            end
        end
    end
end
```

其中的playbook.yml主要用于一些软件的安装和简单的配置，内容如下：

```yaml
---
- hosts: all
  tasks:
    - name: install epel-release
      yum:
        name: epel-release
        state: latest
      become: true
    - name: stop & disable firewall
      shell: systemctl stop firewalld && systemctl disable firewalld
      become: true
- hosts: master
  tasks:
    - name: master install softwares
      yum:
        name={{item}}
        state=latest
      with_items:
        - etcd
        - kubernetes-master
      become: true
- hosts: nodes
  tasks:
    - name: nodes install softwares
      yum:
        name={{item}}
        state=latest
      with_items:
        - vim
        - bash-completion
        - docker
        - flannel
        - kubernetes-node
      become: true
```

上面的playbook定义了一些任务，分别是关闭了所有虚拟机的防火墙；在master节点上安装了etcd，kubernetes-master等软件；在node节点上安装了vim，bash-completion，docker，flannel，kubernetes-node等软件。运行`vagrant up`启动定义好的四个虚拟机。

# master 节点配置

执行`vagrant ssh k8s-node1`登录到master节点上，执行`sudo su`切换到root用户

1. 编辑/etc/etcd/etcd.conf文件:

    ```conf
    ETCD_NAME=master
    ETCD_DATA_DIR="/var/lib/etcd/default.etcd"
    ETCD_LISTEN_CLIENT_URLS="http://0.0.0.0:2379"
    ETCD_ADVERTISE_CLIENT_URLS="http://192.168.12.81:2379"
    ```

2. 编辑/etc/kubernetes/apiserver文件:

    ```conf
    KUBE_API_ADDRESS="--insecure-bind-address=0.0.0.0"
    KUBE_API_PORT="--port=8080"
    KUBELET_PORT="--kubelet-port=10250"
    KUBE_ETCD_SERVERS="--etcd-servers=http://127.0.0.1:2379"
    KUBE_SERVICE_ADDRESSES="--service-cluster-ip-range=10.254.0.0/16"
    KUBE_ADMISSION_CONTROL="--admission-control=NamespaceLifecycle,NamespaceExists,LimitRanger,SecurityContextDeny,ResourceQuota"
    KUBE_API_ARGS=""
    ```

3. 启动etcd、kube-apiserver、kube-controller-manager、kube-scheduler、docker等服务，并设置开机启动。

    ```bash
    for service in etcd kube-apiserver kube-controller-manager kube-scheduler docker; do systemctl restart $service;systemctl enable $service;systemctl status $service ; done
    ```

# node 节点配置

登录到各个node节点上（包括即作为master也作为node的k8s-node1节点），执行以下操作。

1. 为flannel网络指定etcd服务，修改/etc/sysconfig/flanneld文件:

    ```conf
    FLANNEL_ETCD="http://192.168.12.81:2379"
    FLANNEL_ETCD_KEY="/atomic.io/network"
    FLANNEL_OPTIONS="--iface=enp0s8"
    ```

    etcd和flannel用于配置容器的跨主机通信，具体见[etcd & flannel](./struct/etcd--flannel/)

2. 修改/etc/kubernetes/config文件:

    ```conf
    KUBE_LOGTOSTDERR="--logtostderr=true"
    KUBE_LOG_LEVEL="--v=0"
    KUBE_ALLOW_PRIV="--allow-privileged=false"
    KUBE_MASTER="--master=http://192.168.12.81:8080"
    ```
    
3. 修改kubelet配置文件/etc/kubernetes/kubelet:

    ```conf
    KUBELET_ADDRESS="--address=0.0.0.0"
    KUBELET_PORT="--port=10250"
    #这里的KUBELET_HOSTNAME是该node的ip地址
    KUBELET_HOSTNAME="--hostname-override=192.168.12.82"
    KUBELET_API_SERVER="--api-servers=http://192.168.12.81:8080"
    KUBELET_POD_INFRA_CONTAINER="--pod-infra-container-image=registry.access.redhat.com/rhel7/pod-infrastructure:latest"
    KUBELET_ARGS=""
    ```

4. 在所有Node节点上启动kube-proxy,kubelet,docker,flanneld等服务，并设置开机启动。

    ```bash
    for service in kube-proxy kubelet docker flanneld;do systemctl restart $service;systemctl enable $service;systemctl status $service; done
    ```

# 查看集群状态

在master节点k8s-node1上执行`kubectl get nodes`:

```bash
kubectl get nodes
NAME            STATUS    AGE
192.168.12.81   Ready     22h
192.168.12.82   Ready     22h
192.168.12.83   Ready     22h
192.168.12.84   Ready     22h
```

看到节点的状态是ready说明集群已经搭建成功。
