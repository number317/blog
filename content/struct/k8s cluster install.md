+++
title = "K8s Cluster Install"
date = 2017-11-01T09:19:26+08:00
draft = true
tags = ["k8s"]
categories = ["struct"]
+++

# vagrant kubernetes 集群安装

```
yum -y install epel-release
systemctl stop firewalld
systemctl disable firewalld
yum -y install flannel kubernetes-node
```

为flannel网络指定etcd服务，修改/etc/sysconfig/flanneld文件

```
FLANNEL_ETCD="http://192.168.12.121:2379"
FLANNEL_ETCD_KEY="/atomic.io/network"
```

修改/etc/kubernetes/config文件

```
KUBE_LOGTOSTDERR="--logtostderr=true"
KUBE_LOG_LEVEL="--v=0"
KUBE_ALLOW_PRIV="--allow-privileged=false"
KUBE_MASTER="--master=http://192.168.12.121:8080"
```

按照如下内容修改对应node的配置文件/etc/kubernetes/kubelet

node1:

```
KUBELET_ADDRESS="--address=0.0.0.0"
KUBELET_PORT="--port=10250"
KUBELET_HOSTNAME="--hostname-override=192.168.12.124" #修改成对应Node的IP
KUBELET_API_SERVER="--api-servers=http://192.168.12.121:8080" #指定Master节点的API Server
KUBELET_POD_INFRA_CONTAINER="--pod-infra-container-image=registry.access.redhat.com/rhel7/pod-infrastructure:latest"
KUBELET_ARGS=""
```

```
for SERVICES in kube-proxy kubelet docker flanneld;do systemctl restart $SERVICES;systemctl enable $SERVICES;systemctl status $SERVICES; done
```


