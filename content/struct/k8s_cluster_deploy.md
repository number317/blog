+++
title = "K8s Cluster Deploy"
date = 2017-12-04T09:19:26+08:00
draft = false
tags = ["k8s"]
categories = ["struct"]
+++

# vagrant kubernetes 集群部署

## 集群说明

集群共有四个节点，一个master节点，四个子节点，其中一个节点即是master节点，也是node节点，系统均为centos-7.2。

```conf
k8s-node1      192.168.12.81       master, node
k8s-node2      192.168.12.82       node
k8s-node3      192.168.12.83       node
k8s-node4      192.168.12.84       node
```

## vagrant 配置

vagrant 的 box 可选用 bento/centos-7.2:

<details>
<summary>Vagrantfile</summary>

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
</details>

其中的 playbook.yml 主要用于一些软件的安装和简单的配置，内容如下：

<details>
<summary>playbook</summary>

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
</details>

上面的 playbook 定义了一些任务，分别是关闭了所有虚拟机的防火墙；在 master 节点上安装了 etcd，kubernetes-master 等软件；在 node 节点上安装了 vim，bash-completion，docker，flannel，kubernetes-node 等软件。运行`vagrant up`启动定义好的四个虚拟机。

# master 节点配置

执行`vagrant ssh k8s-node1`登录到 master 节点上，执行`sudo su`切换到 root 用户

1. 编辑`/etc/etcd/etcd.conf`文件:

    ```conf
    ETCD_NAME=master
    ETCD_DATA_DIR="/var/lib/etcd/default.etcd"
    ETCD_LISTEN_CLIENT_URLS="http://0.0.0.0:2379"
    ETCD_ADVERTISE_CLIENT_URLS="http://192.168.12.81:2379"
    ```

2. 编辑`/etc/kubernetes/apiserver`文件:

    ```conf
    KUBE_API_ADDRESS="--insecure-bind-address=0.0.0.0"
    KUBE_API_PORT="--port=8080"
    KUBELET_PORT="--kubelet-port=10250"
    KUBE_ETCD_SERVERS="--etcd-servers=http://127.0.0.1:2379"
    KUBE_SERVICE_ADDRESSES="--service-cluster-ip-range=10.254.0.0/16"
    KUBE_ADMISSION_CONTROL="--admission-control=NamespaceLifecycle,NamespaceExists,LimitRanger,SecurityContextDeny,ResourceQuota"
    KUBE_API_ARGS=""
    ```

3. 启动 etcd、kube-apiserver、kube-controller-manager、kube-scheduler、docker 等服务，并设置开机启动。

    ```bash
    for service in etcd kube-apiserver kube-controller-manager kube-scheduler docker; do systemctl restart $service;systemctl enable $service;systemctl status $service ; done
    ```

# node 节点配置

登录到各个 node 节点上（包括即作为 master 也作为 node 的 k8s-node1 节点），执行以下操作。

1. 为 flannel 网络指定 etcd 服务，修改`/etc/sysconfig/flanneld`文件:

    ```conf
    FLANNEL_ETCD="http://192.168.12.81:2379"
    FLANNEL_ETCD_KEY="/atomic.io/network"
    FLANNEL_OPTIONS="--iface=enp0s8"
    ```

    etcd和flannel用于配置容器的跨主机通信，具体见[etcd & flannel](./struct/etcd--flannel/)

2. 修改`/etc/kubernetes/config`文件:

    ```conf
    KUBE_LOGTOSTDERR="--logtostderr=true"
    KUBE_LOG_LEVEL="--v=0"
    KUBE_ALLOW_PRIV="--allow-privileged=false"
    KUBE_MASTER="--master=http://192.168.12.81:8080"
    ```
    
3. 修改kubelet配置文件`/etc/kubernetes/kubelet`:

    ```conf
    KUBELET_ADDRESS="--address=0.0.0.0"
    KUBELET_PORT="--port=10250"
    #这里的KUBELET_HOSTNAME是该node的ip地址
    KUBELET_HOSTNAME="--hostname-override=192.168.12.82"
    KUBELET_API_SERVER="--api-servers=http://192.168.12.81:8080"
    KUBELET_POD_INFRA_CONTAINER="--pod-infra-container-image=registry.cn-hangzhou.aliyuncs.com/architect/pod-infrastructure"
    KUBELET_ARGS=""
    ```

    这里的`KUBELET_POD_INFRA_CONTAINER`默认的镜像需要翻墙，这里改成了阿里云的镜像，便于下载。

4. 在所有 Node节点上启动 kube-proxy,kubelet,docker,flanneld 等服务，并设置开机启动。

    ```bash
    for service in kube-proxy kubelet docker flanneld;do systemctl restart $service;systemctl enable $service;systemctl status $service; done
    ```

# 查看集群状态

在master节点 k8s-node1 上执行`kubectl get nodes`:

```bash
kubectl get nodes
NAME            STATUS    AGE
192.168.12.81   Ready     22h
192.168.12.82   Ready     22h
192.168.12.83   Ready     22h
192.168.12.84   Ready     22h
```

看到节点的状态是 ready 说明集群已经搭建成功。

# 配置dashboard

部署文件 dashboard.yml 如下：

<details>
<summary>dashboard deploy</summary>

```yml
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: kubernetes-dashboard-v1.7.1
  namespace: kube-system
spec:
  replicas: 1
  template:
    metadata:
      labels:
        k8s-app: kubernetes-dashboard
        version: v1.7.1
        kubernetes.io/cluster-service: "true"
    spec:
      containers:
      - name: kubernetes-dashboard
        image: registry.cn-hangzhou.aliyuncs.com/google-containers/kubernetes-dashboard-amd64
        resources:
          limits:
            cpu: 100m
            memory: 50Mi
          requests:
            cpu: 100m
            memory: 50Mi
        ports:
        - containerPort: 9090
        args:
         -  --apiserver-host=http://192.168.12.81:8080
        livenessProbe:
          httpGet:
            path: /
            port: 9090
          initialDelaySeconds: 30
          timeoutSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: kubernetes-dashboard
  namespace: kube-system
  labels:
    k8s-app: kubernetes-dashboard
    kubernetes.io/cluster-service: "true"
spec:
  selector:
    k8s-app: kubernetes-dashboard
  ports:
  - port: 80
    targetPort: 9090
```
</details>

在master节点192.168.12.81上执行

```bash
kubectl apply -f dashboard.yml
```

等待 pod 部署好后，访问`192.168.12.81:8080/ui`即可看到 dashboard 的界面。
