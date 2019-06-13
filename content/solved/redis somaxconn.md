+++
title = "Redis Somaxconn"
date = 2018-08-13T11:07:55+08:00
draft = false
tags = ["redis", "kubernetes"]
categories = ["solved"]
+++

# kubernetes redis 最大连接数设置

应用在进行压力测试的时候发现请求多（5000并发）的时候会报出redis连接超时错误，查看了redis的配置，发现如下配置：

```conf
# TCP listen() backlog.
#
# In high requests-per-second environments you need an high backlog in order
# to avoid slow clients connections issues. Note that the Linux kernel
# will silently truncate it to the value of /proc/sys/net/core/somaxconn so
# make sure to raise both the value of somaxconn and tcp_max_syn_backlog
# in order to get the desired effect.
tcp-backlog 511
```

从这个配置可以看到，reids的最大连接数配置了511，所以应该将这个配置调高。注释里有提醒这个配置会受到linux内核配置的限制，查看`/proc/sys/net/core/somaxconn`，发现这个值只有128，所以redis配置`tcp-backlog 511`并没有生效，实际值只有128。

由于这里的redis是通过kubernetes部署的，所以需要同时修改宿主机和容器的内核参数。由于集群中有许多主机，所以我们通过为三台节点添加标签和污点来搭建redis等中间件应用并且防止其他应用部署到这些节点。通过查阅资料发现要修改k8s部署的容器的内核参数，需要开启kubelet的配置。所以具体操作分为四步：

1. 为节点添加标签和污点
1. 修改主机内核参数
2. 修改kubelet配置
3. 修改容器内核参数
4. 修改redis配置并重启

## 节点添加标签和污点

为节点添加标签：

```bash
kubectl label node <nodename> middleware=true
```

这里为节点添加了`middleware=true`的标签。为了增加辨识度，可以给节点添加`middleware`的角色：

```bash
kubectl label node <nodename> node-role.kubernetes.io/middleware=""
```

这样在执行`kubectl get node`命令的时候可以清楚地看到哪三台是用于部署中间件的节点：

<details>
<summary>kubectl get node</summary>

```bash
NAME          STATUS    ROLES             AGE       VERSION
node1         Ready     master            186d      v1.8.5
node2         Ready     node              60d       v1.8.5
node3         Ready     node              60d       v1.8.5
node4         Ready     node              60d       v1.8.5
node5         Ready     node              60d       v1.8.5
node6         Ready     node              117d      v1.8.5
node7         Ready     master            186d      v1.8.5
node8         Ready     master            186d      v1.8.5
node9         Ready     node              34d       v1.8.5
node10        Ready     node              72d       v1.8.5
node11        Ready     node              72d       v1.8.5
node12        Ready     node              60d       v1.8.5
node13        Ready     middleware,node   19d       v1.8.5
node14        Ready     middleware,node   19d       v1.8.5
node15        Ready     middleware,node   19d       v1.8.5
node16        Ready     node              4d        v1.8.5
node17        Ready     node              123d      v1.8.5
node18        Ready     node              123d      v1.8.5
```

</details>

为节点添加污点：

```bash
kubectl taint node <nodename> middleware="true":Noschedule
```

这样设置后在kubernetes部署应用时如果不指明忍受污点，那么应用是不会部署到这三个节点的。

## 修改主机最大连接数设置

修改`/etc/sysctl.d/99-sysctl.conf`文件，这里设置最大连接数为5000，在最后一行添加：

```conf
net.core.somaxconn=5000
```

然后执行：

```bash
sysctl -p
```

查看`/proc/sys/net/core/somaxconn`进行验证。

## 修改kubelet配置

修改`/etc/systemd/system/kubelet.service.d/20-kubelet-override.conf`文件，在参数后面添加`--experimental-allowed-unsafe-sysctls='net.core.somaxconn'`

```conf
[Service]
Environment="KUBELET_EXTRA_ARGS=--pod-infra-container-image=registry.saas.crland.com.cn/google_containers/pause-amd64:3.0 --fail-swap-on=false --hostname-override=zdztvura16 --eviction-hard=memory.available<1024Mi,nodefs.available<10Gi,imagefs.available<10Gi --eviction-minimum-reclaim=memory.available=500Mi,nodefs.available=5Gi,imagefs.available=5Gi --eviction-pressure-transition-period=5m0s --system-reserved=cpu=100m,memory=2Gi --experimental-allowed-unsafe-sysctls='net.core.somaxconn'"
Environment="KUBELET_DNS_ARGS=--cluster-dns=10.233.0.10 --cluster-domain=cluster.local"
Environment="KUBELET_CADVISOR_ARGS=--cadvisor-port=4194"
```

重新启动kubelet：

```bash
systemctl daemon-reload
systemctl restart kubelet
```

## 修改容器内核参数

修改redis的deployement配置：

<details>
<summary> redis deployment </summary>
```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: openapi-redis-dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: openapi-redis-dev
  template:
    metadata:
      annotations:
        security.alpha.kubernetes.io/unsafe-sysctls: net.core.somaxconn=2000
      labels:
        app: openapi-redis-dev
    spec:
      nodeSelector:
        middleware: "true"
      tolerations:
        - effect: NoSchedule
          key: middleware
          operator: Exists
      containers:
        - name: openapi-redis-dev
          image: 'registry.saas.crland.com.cn/tools/redis
          command:
          - /bin/sh
          - -c
          - redis-server /usr/local/etc/redis/redis.conf
          ports:
            - containerPort: 6379
              protocol: TCP
          resources:
            limits:
              cpu: '2000m'
              memory: 256Mi
            requests:
              cpu: 10m
              memory: 64Mi
          terminationMessagePath: /dev/termination-log
          imagePullPolicy: Always
          volumeMounts:
            - name: redis-data
              mountPath: /var/lib/redis
            - name: redis-conf
              mountPath: /usr/local/etc/redis/redis.conf
              subPath: redis.conf
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
      dnsPolicy: ClusterFirst
      securityContext: {}
      volumes:
        - name: redis-data
          persistentVolumeClaim:
            claimName: openapi-redis-dev
        - name: redis-conf
          configMap:
            defaultMode: 420
            name: openapi-redis-dev-config
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
```
</details>

这里添加了注解`security.alpha.kubernetes.io/unsafe-sysctls: net.core.somaxconn=2000`，设置最大连接数为2000，同时还添加了`nodeSelector`和`tolerations`用于选择部署节点。

## 修改redis配置

修改redis对应的configMap，将`tcp-backlog`设置为2000，再重新部署redis。再此进行压力测试，可以发现有效果。
