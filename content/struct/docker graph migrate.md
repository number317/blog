+++
title = "Docker Graph Migrate"
date = 2019-05-14T19:33:12+08:00
draft = false
tags = ["docker"]
categories = ["struct"]
+++

# docker 目录迁移

服务器根目录磁盘空间比较小，只有50G，在使用一段时间后镜像增多，磁盘不够用，准备将 docker 的目录挂载到新加的磁盘。挂载硬盘后如下：

```bash
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sr0     11:0    1  3.7M  0 rom
vda    253:0    0   50G  0 disk
└─vda1 253:1    0   50G  0 part /
vdb    253:16   0  200G  0 disk
```

## 创建 lvm

为了以后方便扩容，准备使用 lvm。首先创建 pv：

```bash
pvcreate /dev/vdb
```

创建 vg，命名为 docker：

```bash
vgcreate docker /dev/vdb
```

创建 lv，命名为 registry：

```bash
lvcreate -l +100%Free docker --name registry
```

将 lv 格式化为 xfs 文件系统：

```bash
mkfs.xfs /dev/docker/registry
```

## 替换目录

首先要将改节点的 pod 全都驱散走：

```bash
kubectl cordon nodetest
kubectl drain nodetest --ignore-daemonsets --delete-local-data
```

在节点上停止 docker 服务：

```bash
systemctl stop docker
```

挂载目录到`Docker Root Dir`，如果不是这个默认路径，可以通过`docker info`命令查看：

```bash
mount /dev/docker/registry /var/lib/docker
```

由于服务器上跑的容器都是无状态的，所以没有什么数据是需要保存的，无需备份，直接挂载。

重启 docker：

```bash
systemctl restart docker
```

将 /dev/docker/registry 写入 `/etc/fstab` 文件：

```
/dev/docker/registry /var/lib/docker      xfs        defaults,noatime,nodiratime,nobarrier,discard,allocsize=256m,logbufs=8,attr2,logbsize=256k	0 0
```

这样可以保证服务器重启时能自动挂载 /dev/docker/registry。由于新加的硬盘是 ssd，所以添加了一些针对 ssd 的参数。

最后重新将节点设置为可调度：

```bash
kubectl uncordon nodetest
```
