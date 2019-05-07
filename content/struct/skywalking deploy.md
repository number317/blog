+++
title = "Skywalking Deploy"
date = 2019-04-25T09:16:15Z
draft = false
tags = ["tags"]
categories = ["categories"]
+++

# skywalking 部署

skywalking 是一个国产开源的调用链监控工具，可用于分析请求中哪些操作比较慢。[官方](https://github.com/apache/skywalking-kubernetes)提供了 k8s 的部署配置，但这个配置里的镜像是不对的，具体版本对应的镜像可以在[Dockerhub](https://hub.docker.com/r/apache/skywalking-oap-server)上找到。如果想要更换版本，最好把 ES 中的索引先删除，否则可能会导致应用报错。

## 架构说明

* elasticsearch: 用于存储 skywalking 数据，这里使用的是腾讯云的 ES 服务，因此无需搭建
* skywalking-oap-server: skywalking 后端
* ui: 默认 ui 界面
* [rocketbot-ui](https://github.com/apache/skywalking-rocketbot-ui): skywalking 的另一个官方前端界面，没有现成的镜像，需要自己构建

## 部署 

将官方的部署文件克隆到本地，将 oap， ui 的镜像换成对应的版本镜像。修改 oap 配置中的 ES 地址：

```yaml
storage:
  elasticsearch:
    clusterNodes: elasticsearch:9200
```

先创建命名空间：

```bash
kubectl create ns skywalking
```

接着部署 oap 后端：

```bash
kubectl apply -f oap/
```

再部署前端：

```bash
kubectl apply -f ui/
```

为了集群外部访问，可以为前端配置一个域名或者在 service 中添加 externalIPs。

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  generation: 1
  name: ui
  namespace: skywalking
spec:
  rules:
  - host: skywalking.test.com.
    http:
      paths:
      - backend:
          serviceName: ui
          servicePort: 80
        path: /
```

rocketbot-ui 属于可选配置，配置文件如下：

<details>
<summary>rocketbot-ui 部署文件</summary>

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rocketbot-ui
  namespace: skywalking
  labels:
    app: rocketbot-ui
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rocketbot-ui
  template:
    metadata:
      labels:
        app: rocketbot-ui
    spec:
      containers:
      - name: rocketbot-ui
        image: rocketbot-ui:v1.0.3
        env:
        - name: TZ
          value: "Asia/Shanghai"
        ports:
        - containerPort: 80
          name: page
        resources:
          requests:
            memory: 1Gi
          limits:
            memory: 2Gi
        env:
        - name: SKYWALKING_URL
          value: oap:12800
---
apiVersion: v1
kind: Service
metadata:
  name: rocketbot-ui
  namespace: skywalking
  labels:
    service: rocketbot-ui
spec:
  ports:
  - port: 80
    name: http
    targetPort: page
  selector:
    app: rocketbot-ui
---
kind: Ingress
metadata:
  generation: 1
  name: rocketbot-ui
  namespace: skywalking
spec:
  rules:
  - host: rocketbot-ui.test.com
    http:
      paths:
      - backend:
          serviceName: rocketbot-ui
          servicePort: 80
        path: /
```

</details>

## Java 应用接入 agent

将 Java 应用接入 skywalking 需要下载对应版本的 agent，比如上面部署的版本是 6.0.0-GA，那么就在 skywalking 的 [release](https://github.com/apache/skywalking/releases) 页面找到对应的版本下载（如果版本对应不上通常会报错）。下载完解压可以找到一个 agent 目录。修改 `agent/config/agent.config` 配置文件，一般主要修改四个配置：

* agent.service_name: 在界面上显示的应用名字
* agent.ignore_suffix: 忽略以哪些为后缀的请求，通常忽略前端资源，如`.jpg,.jpeg,.js,.css,.png,.bmp,.gif,.ico,.mp3,.mp4,.html,.svg`
* collector.backend_service: oap 后端的地址，默认端口是 11800，在同一集群中的应用可以用 oap svc 地址，集群外的应用想要访问需要为 oap 的 svc 配置 externalIPs
* logging.level: oap 的日志级别，在 `agent/logs` 目录下可以看到日志文件，通常写 `info` 级别即可

启动 Java 应用

```bash
java $JAVA_OPTS -javaagent:/agent/skywalking-agent.jar -jar app.jar
```

## Tomcat 接入 agent

在 catalina.sh 启动脚本中添加以下命令：

```
if [[ $ENABLE_SKAGENT == true ]]; then
    CATALINA_OPTS="$CATALINA_OPTS -javaagent:/agent/skywalking-agent.jar"; export CATALINA_OPTS
fi
```

这里添加了条件判断是为了在容器中使用时可以方便地通过环境变量来控制是否启用 skywalking。

## 添加 oracle 数据库插件

agent 里默认不带 oracle 数据库的插件，所以在请求中无法解析 oracle 数据库的操作。可以在[java-plugin-extensions](https://github.com/OpenSkywalking/java-plugin-extensions)下载 oracle 数据库的插件，并将插件 jar 包文件放到 `agent/plugins` 目录下，重启应用就可以看到 oracle 数据库的操作了。
