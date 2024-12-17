+++
title = "K8s Note"
date = 2019-08-01T16:34:31+08:00
draft = false
tags = ["k8s"]
categories = ["struct"]
+++

# k8s 备忘

## ingress 配置证书

首先要在 `ingress` 所在 `namespace` 下创建 `tls` 类型的 `secret`:

```bash
kubectl create secret tls https-certs --key /path/to/keyfile --cert /path/to/certfile -n the-namespace
```

修改 `ingress` 配置，`kubectl edit ing ingname -n the-namespace`，在 `spec` 添加如下内容，注意和 `rules` 同级:

```yaml
tls:
- hosts:
  - www.test.com
  secretName: https-certs
```

`ingress` 配置了 https 证书后默认会强制跳转到 https 协议，如果不想强制跳转，可以在 `annotations` 添加如下配置:

```yaml
nginx.ingress.kubernetes.io/ssl-redirect: "false"
```

旧版本的配置无需加上 nginx 前缀:

```yaml
ingress.kubernetes.io/ssl-redirect: "false"
```

更多的 annotations 配置可以查看 [github 文档](https://github.com/kubernetes/ingress-nginx/blob/master/docs/user-guide/nginx-configuration/annotations.md)

## ingress 配置超时

应用接口响应较慢的情况下可能需要修改 nginx 的超时配置，默认是 60s，可以在 `annotations` 添加如下配置:

```yaml
annotations:
    nginx.ingress.kubernetes.io/client-body-buffer-size: 100M
    nginx.ingress.kubernetes.io/proxy-body-size: 100M
    nginx.ingress.kubernetes.io/proxy-buffer-size: 100M
    nginx.ingress.kubernetes.io/proxy-buffering: "on"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
```

这里将超时改成了 5m

## 为节点添加标签

```bash
kubectl label node1 test=true
```

这里添加了 "test=true" 的标签

```bash
kubectl label node node1 node-role.kubernetes.io/node=""
```

添加上述标签可以改变 `kubectl get node` 时的角色显示

## 为节点添加污点

```bash
kubectl taint node node1 test="true":NoSchedule
```

为 node1 节点的 "test=true" 标签添加了不可调度的污点

## 选择节点部署 pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    env: test
spec:
  containers:
  - name: nginx
    image: nginx
    imagePullPolicy: IfNotPresent
  nodeSelector:
    disktype: ssd
    kubernetes.io/hostname: node1
```

## init 容器

init 容器在应用程序容器启动前运行，用来包含一些应用镜像中不存在的实用工具或安装脚本。

* 比如可以用于等待一个 Service 创建成功，通过类似如下 shell 命令：

```bash
until nslookup myservice; do echo waiting for myservice, sleep 10; done;
```

* 将 Pod 注册到远程服务器，通过在命令中调用 API，类似如下：

```bash
curl -X POST http://$MANAGEMENT_SERVICE_HOST:$MANAGERMENT_SERVICE_PORT/registr -d 'instance=$(<POD_NAME>)&ip=$(<POD_IP>)'
```

<details>
<summary>pod.yaml</summary>

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
  labels:
    app: myapp
spec:
  containers:
  - name: myapp-container
    image: busybox
    command: ['sh', '-c', 'echo The app is running! && sleep 3600']
  initContainers:
  - name: init-myservice
    image: busybox
    command: ['sh', '-c', 'until nslookup myservice; do echo waiting for myservice; sleep 2; done;']
  - name: init-mydb
    image: busybox
    command: ['sh', '-c', 'until nslookup mydb; do echo waiting for mydb; sleep 2; done;']
```
</details>
