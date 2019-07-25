+++
title = "Ceph Ansible"
date = 2019-06-23T16:45:52+08:00
draft = false
tags = ["ceph"]
categories = ["struct"]
+++

# Ceph 介绍

无论是想要为云平台提供 [Ceph Object Storage](http://docs.ceph.com/docs/master/glossary/#term-ceph-object-storage) 或 [Ceph Block Device](http://docs.ceph.com/docs/master/glossary/#term-ceph-block-device) 服务，部署一个 [Ceph Filesystem](http://docs.ceph.com/docs/master/glossary/#term-ceph-filesystem) 总是从设置每一个 [Ceph 节点](http://docs.ceph.com/docs/master/glossary/#term-ceph-node)，网络和 Ceph 存储集群开始。一个 Ceph 存储集群至少需要一个 Ceph Monitor，Ceph Manger，和 Ceph OSD(Object Storage Daemon)。当运行 Ceph 文件系统客户端时也需要 Ceph Metadata Server。

* Monitors: 一个 [Ceph 监视器(ceph-mon)](http://docs.ceph.com/docs/master/glossary/#term-ceph-monitor) 维护集群状态的映射，包括监视器，管理，OSD 和 CURSH 映射。这些映射是 Ceph 守护进程之间相互协调的关键。监视器还负责管理守护进程和客户端之间的身份验证。为了保证冗余和高可用，至少需要3个监视器。

* Mangers: 一个 [Ceph 管理(ceph-mgr)](http://docs.ceph.com/docs/master/glossary/#term-ceph-manager)守护进程负责保持追踪 Ceph 集群运行时指标和当前集群状态，包括存储利用率，当前的性能指标和系统负载。Ceph 管理进程还托管基于 python 的模块来管理和公开 Ceph 集群信息，包括一个基于网页的 [Ceph Dashboard](http://docs.ceph.com/docs/master/mgr/dashboard/#mgr-dashboard) 和 [REST API](http://docs.ceph.com/docs/master/mgr/restful)。为了保证高可用，至少需要2个管理节点。

* Ceph OSDs: 一个 [Ceph OSD(object storage daemon, ceph-osd)](http://docs.ceph.com/docs/master/glossary/#term-ceph-osd)存储数据，处理数据复制、恢复、重新平衡，并通过检查其他 Ceph OSD 进程的心跳来提供一些监控信息给 Ceph 监视器和管理。为了保证冗余和高可用，至少需要3个 Ceph OSDs。

* MDSs: 一个 [Ceph 元数据服务(MDS, ceph-mds)](http://docs.ceph.com/docs/master/glossary/#term-ceph-metadata-server)存储代表 [Ceph 文件系统](http://docs.ceph.com/docs/master/glossary/#term-ceph-filesystem)（例如 Ceph 快设备和 Ceph 对象存储就不使用 MDS）的元数据。Ceph 元数据服务允许 POSIX 文件系统用户执行基本的命令（像 `ls`, `find` 等）而不会给 Ceph 存储集群代理极大的负载。

Ceph 将数据存储为逻辑存储池中的对象。利用 [CRUSH](http://docs.ceph.com/docs/master/glossary/#term-crush) 算法，Ceph 计算哪个放置组应该存储该对象，并进一步计算哪个 Ceph 进程节点应该存储改放置组。CRUSH 算法能使 Ceph 存储集群能够动态扩展，重新平衡和恢复。

# ceph-ansible

ceph 官方提供了 ansible 的安装脚本 [ceph-ansible](https://github.com/ceph/ceph-ansible.git)。将项目克隆到本地，可以看到最新的温度版本是`stable-4.0`。根据集群要求准备了6台服务器。部署 OSDs 的节点需要一块额外的磁盘用作存储。ansible 的 hosts 文件如下所示:

```
[all]
192.168.0.10    ansible_host=192.168.0.10    ansible_user=test    ansible_become=true
192.168.0.11    ansible_host=192.168.0.11    ansible_user=test    ansible_become=true
192.168.0.12    ansible_host=192.168.0.12    ansible_user=test    ansible_become=true
192.168.0.13    ansible_host=192.168.0.13    ansible_user=test    ansible_become=true
192.168.0.14    ansible_host=192.168.0.14    ansible_user=test    ansible_become=true
192.168.0.15    ansible_host=192.168.0.15    ansible_user=test    ansible_become=true

[mons]
192.168.0.10
192.168.0.11
192.168.0.12

[osds]
192.168.0.13
192.168.0.14
192.168.0.15

[mgrs]
192.168.0.10
192.168.0.11
```

这里将 192.168.0.10 作为用于执行 ansible-playbook 的节点。在这个节点上需要配置到另外5台服务器的 ssh 免密码登录（也可以在 hosts 文件中配置密码）。并安装一些依赖:

```bash
yum install -y ansible epel-release python2-pip
pip install -r requirements.txt
```

配置 `site.yml` 配置文件，将没用到的 hosts 注释:

```yaml
- hosts:
  - mons
  - osds
  - mgrs
```

配置全局变量 `group_vars/all.yml`:

```yaml
cluster: ceph

centos_package_dependencies:
  - epel-release
  - libselinux-python
ceph_origin: repository
ceph_repository: community
ceph_mirror: http://mirrors.163.com/ceph
ceph_stable_key: http://mirrors.163.com/ceph/keys/release.asc
ceph_stable_repo: "{{ ceph_mirror }}/rpm-{{ ceph_stable_release }}"
ceph_stable_release: nautilus
ceph_stable: true
fetch_directory: ~/ceph-ansible-keys
monitor_interface: eth0
public_network: 192.168.0.0/24
cluster_network: "{{ public_network }}"
```

配置 `OSDs` 变量，主要配置用哪个盘存储数据:

```yaml
devices:
  - /dev/vdb
```

配置好可以运行 `ansible-playbook -i hosts site.yml;`。等待 ceph 安装完毕。安装完成后执行 `ceph -s` 可以看到如下输出:

```
  cluster:
    id:     b358e8f9-3ffa-438b-8b38-38f9f5468d12
    health: HEALTH_OK
 
  services:
    mon: 3 daemons, quorum VM_48_51_centos,VM_48_62_centos,VM_48_83_centos (age 2d)
    mgr: VM_48_51_centos(active, since 2d), standbys: VM_48_83_centos
    osd: 3 osds: 3 up (since 87m), 3 in (since 87m)
 
  data:
    pools:   0 pools, 0 pgs
    objects: 0 objects, 0 B
    usage:   3.0 GiB used, 294 GiB / 297 GiB avail
    pgs:     
```

# kubernetes 配置 ceph

创建 RBD pool:

```bash
ceph osd pool create kube 128
```

授权 kube 用户:

```bash
ceph auth get-or-create client.kube mon 'allow r' osd 'allow class-read, allow rwx pool=kube' -o ceph.client.kube.keyring
ceph auth get client.kube
```

创建 ceph secret:

```bash
ceph auth get-key client.admin | base64
ceph auth get-key client.kube | base64
kubectl apply -f ceph-kube-secret.yml
```

<details>
    <summary>ceph-kube-secret.yml</summary>

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ceph
---
apiVersion: v1
kind: Secret
metadata:
  name: ceph-admin-secret
  namespace: ceph
type: kubernetes.io/rbd
data:
  key: QVFEVGdBOWQ4bDA1TUJBQWhnamFJNHd6QzROVXJyR1J3RnlPWnc9PQ==
---
apiVersion: v1
kind: Secret
metadata:
  name: ceph-kube-secret
  namespace: ceph
type: kubernetes.io/rbd
data:
  key: QVFBVWJ4VmRYbHNwS3hBQUxJSDdQWmxlalk5WW10Rm5DRnQwU2c9PQ==
```
</details>

创建动态 RBD StorageClass:

```yaml
kubectl apply -f ceph-kube-secret.yaml
```

<details>
    <summary>ceph-storageclass.yaml</summary>
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-rbd
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: kubernetes.io/rbd
parameters:
  monitors: 192.168.0.10:6789,192.168.0.11:6789,192.168.0.12:6789
  adminId: admin
  adminSecretName: ceph-admin-secret
  adminSecretNamespace: ceph
  pool: kube
  userId: kube
  userSecretName: ceph-kube-secret
  fsType: xfs
  imageFormat: "2"
  imageFeatures: "layering"
```
</details>

创建 pvc:

```bash
kubectl apply -f ceph-pvc.yaml -n ceph
```

<details>
    <summary>ceph-pvc.yaml</summary>
```
kind: PersistentVolumeClaim
metadata:
  name: ceph-pvc
  namespace: ceph
spec:
  storageClassName: ceph-rbd
  accessModes:
     - ReadOnlyMany
  resources:
    requests:
      storage: 1Gi
```
</details>

查看 pvc 的状态发现一直是 pending，describe 查看 pvc 事件，发现报错:

```
rbd: create volume failed, err: executable file not found in $PATH
```

结合日志查阅资料发现是在 kube-controller-manager 的 pod 容器中没有 rbd 命令。具体可以查看 [github issue](https://github.com/kubernetes/kubernetes/issues/38923)

可以通过安装 [external-storage](https://github.com/kubernetes-incubator/external-storage) 插件来解决。克隆下来后路径如下:

```
ceph
└── rbd
    └── deploy
        ├── non-rbac
        │   └── deployment.yaml
        ├── rbac
        │   ├── clusterrolebinding.yaml
        │   ├── clusterrole.yaml
        │   ├── deployment.yaml
        │   ├── rolebinding.yaml
        │   ├── role.yaml
        │   └── serviceaccount.yaml
        └── README.md
```

由于部署 k8s 集群的时候启用了 rbac，所以我们用 rbac 目录下的部署文件。将 `clusterrolebinding.yaml` 和 `rolebingding.yaml` 的 namespace 修改为 ceph，然后部署:

```bash
kubectl apply -f rbac -n ceph
```

等到部署完成后，修改 storageClass 的配置，把 `provisioner: kubernetes.io/rbd` 更改为 `provisioner: ceph.com/rbd`，重新部署。等待创建完成，重新部署 pvc，发现已经可以绑定了。查看 pvc 发现也已经创建了。

到 ceph 的 monitor 节点上，执行如下命令:

```bash
rbd ls -p kube
rbd info kubernetes-dynamic-pvc-10321857-9952-11e9-aac5-0a580ae9419b -p kube
```

可以获取到 image 的详细信息，说明 ceph 确实被使用了。

创建一个 pod 进行测试，发现也可以创建成功。

```yml
apiVersion: v1
kind: Pod
metadata:
  labels:
    test: rbd-dyn-pvc-pod
  name: ceph-rbd-dyn-pv-pod2
spec:
  containers:
  - name: ceph-rbd-dyn-pv-busybox2
    image: busybox
    command: ["sleep", "60000"]
    volumeMounts:
    - name: ceph-dyn-rbd-vol1
      mountPath: /mnt/ceph-dyn-rbd-pvc/busybox
      readOnly: false
  volumes:
  - name: ceph-dyn-rbd-vol1
    persistentVolumeClaim:
      claimName: ceph-pvc
```
