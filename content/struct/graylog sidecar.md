+++
title = "Graylog Sidecar"
date = 2018-11-14T17:24:04+08:00
draft = false
tags = ["tags"]
categories = ["categories"]
+++

# graylog sidecar 部署配置

graylog sidecar 用于配置从文件读取日志，具体读取文件可以采用filebeat和nxlog。这里在debian的容器中部署sidecar来示例。

## 安装sidecar

从[下载页面](https://github.com/Graylog2/collector-sidecar/releases)下载对应的包，这里是debian系统，graylog版本是2.4。所以根据文档，下载`collector-sidecar_0.1.7-1_amd64.deb`：

```bash
curl -OL "https://github.com/Graylog2/collector-sidecar/releases/download/0.1.7/collector-sidecar_0.1.7-1_amd64.deb"
```

下载好后安装：

```bash
dpkg -i collector-sidecar_0.1.7-1_amd64.deb
```

安装好后配置system服务：

```bash
graylog-collector-sidecar -service install
```

这个命令会生成`/etc/init.d/collector-sidecar`脚步，但是在容器中可能systemctl命令执行不了，可以直接执行该脚本。

## 配置sidecar

编辑配置文件`/etc/graylog/collector-sidecar`，改为以下内容：

```conf
server_url: http://graylog.test.com/api/
update_interval: 10
tls_skip_verify: false
send_status: true
list_log_files:
  - /var/log/connect-check/
collector_id: file:/etc/graylog/collector-sidecar/collector-id
cache_path: /var/cache/graylog/collector-sidecar
log_path: /var/log/graylog/collector-sidecar
log_rotation_time: 86400
log_max_age: 604800
tags:
    - connect-check
backends:
    - name: nxlog
      enabled: false
      binary_path: /usr/bin/nxlog
      configuration_path: /etc/graylog/collector-sidecar/generated/nxlog.conf
    - name: filebeat
      enabled: true
      binary_path: /usr/bin/filebeat
      configuration_path: /etc/graylog/collector-sidecar/generated/filebeat.yml
```

主要是修改`server_url`和`tags`两项内容。

## 生存测试日志

编写一个脚本random.sh来生成一些测试日志：

```bash
#!/bin/bash
while true; do
    flag=$RANDOM
    if [[ $flag -le 10923 ]]; then
        echo "Accept 200, connect checkout success." >> /var/log/connect-check/connect-check.log
    elif [[ $flag -gt 10923 && $flag -le 20491 ]]; then
        echo "Error  500, connect checkout failed. Internal Error" >> /var/log/connect-check/connect-check.log
    else
        echo "Failed 404, connect checkout failed. Connection Not Found" >> /var/log/connect-check/connect-check.log
    fi
    sleep 3
done
```

将脚本放后台执行，持续生成日志：

```bash
nohup ./random.sh &
```

## graylog 配置

1. 在graylog界面上点击`System/Inputs`菜单，创建一个全局的`Beats`输入，配置监听地址`0.0.0.0`，监听端口`5044`

2. 进入`System/Collectors/Manage configurations` 菜单，创建一个新的配置，任意命名为`connect-check`

3. 点击刚刚创建的配置，创建一个`Filebeat`输出，暂时只需要修改`Hosts`的地址，修改为graylog服务器的ip（k8s集群里可以是service的地址）和端口（刚刚创建的全局Beats输入的监听端口）

4. 创建一个`Filebeat`文件输入来收集刚刚脚本生成的测试日志，填写对应的日志路径

5. 为配置添加一个`connect-check`的tag，在tag栏输入tag名，按回车键

## 启动sidecar

执行`/etc/init.d/collector-sidecar start`来启动sidecar，它的日志在`/var/log`目录下，可以查看该目录下的`collector-sidecar.err`文件来检查sidecar的运行状态。

通过日志可以查看到它从graylog获取了新的配置，这个配置就是刚刚在graylog上创建的配置，他们是通过tag来匹配的。现在在graylog的search页面应该可以查看到生成的测试日志了。
