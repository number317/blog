+++
title = "Iptables Intro"
date = 2018-04-26T08:32:31+08:00
draft = false
tags = ["iptables"]
categories = ["system"]
+++

# iptables 介绍

## 基本概念

* iptables 可以检测、修改、转发、重定向和丢弃IPV4数据包。
* 表(tables)
    * raw: 用于配置数据包
    * filter: 存放所有与防火墙相关操作的表
    * nat: 用于网络地址转换
    * mangle: 用于对特定数据包的修改
    * security: 用于强制访问控制
* 链(chains): INPUT, OUTPUT, FORWARD, PREROUTING,POSTROUTING
* 规则(rules): 过滤数据包
* 模块(modules): 用于扩展iptables，进行更复杂的过滤

## 工作流程

![iptables 流程图](/system/images/iptables_intro_img1.jpg)

第一个路由策略包括决定数据包的目的地是本地主机（这种情况下，数据包穿过 INPUT 链），还是其他主机（数据包穿过 FORWARD 链）；

中间的路由策略包括决定给传出的数据包使用那个源地址、分配哪个接口；

最后一个路由策略存在是因为 mangle 与 nat 链可能会改变数据包的路由信息。

数据包通过路径上的每一条链时，链中的每一条规则按顺序匹配；无论何时匹配了一条规则，相应的 target/jump 动作将会执行。最常用的3个 target 是 ACCEPT, DROP ,或者 jump 到用户自定义的链。内置的链有默认的策略，但是用户自定义的链没有默认的策略。在 jump 到的链中，若每一条规则都不能提供完全匹配，那么数据包返回到调用链。在任何时候，若 DROP target 的规则实现完全匹配，那么被匹配的数据包会被丢弃，不会进行进一步处理。如果一个数据包在链中被 ACCEPT，那么它也会被所有的父链 ACCEPT，并且不再遍历其他父链。然而，要注意的是，数据包还会以正常的方式继续遍历其他表中的其他链。 

## 常用选项

| 参数类型  | 可选项    |
| :-------- | --------: |
| 表        | filter, nat...    |
| 链        | INPUT, OUTPUT, FORWARD, PREOUTING（修改目标ip地址）, POSTROUTING（修改源ip地址）...   |
| 匹配属性  | 源、目标IP，协议（TCP,UDP,ICMP...），端口号，网卡接口...  |
| 模块      | conntrack, multiport, connlimit...    |
| 动作      | ACCEPT, DROP, RETURN, REJECT...   |

## 配置运行

```bash
# systemctl start iptables
```

启动时会读取`/etc/iptables/iptables.rules`文件载入规则，如果配置文件不存在会报错
可以直接生成一个空的iptables.rules文件设定空规则`touch /etc/iptables/iptables.rules`

```bash
# systemctl stop iptables
```

停止iptables服务

```bash
# systemctl restart iptables
```

重启iptables服务

## 查看规则

```bash
iptables -nvL --line-number
```

显示当前规则，没有指定表，默认使用filter表。`-n` 以端口号数字形式显示，`-v` 显示详细信息，`-- line-number` 显示规则的行号

```bash
iptables -t nat -S
```

以保存的格式列出nat表当前规则，个人认为，用`-S`选项查看规则更清晰

## filter 表 INPUT 链

```bash
iptables -t filter -A INPUT -s 172.17.0.2 -j DROP
```

`-A` append 追加规则，来自172.17.0.2的包全部丢弃

```bash
iptables -I INPUT -p tcp --dport 22 -j ACCEPT
```

`-I` insert 插入规则，允许ssh远程连接

```bash
iptables -P INPUT DROP
```

`-P` policy 设置内置链的默认策略，ACCEPT或DROP

## filter 表 OUTPUT 链

```bash
iptables -t filter -I OUTPUT 3 -o docker0 -j REJECT
```

REJECT会返回信息，DROP直接丢弃，无返回信息，主机无法访问容器环境

```bash
iptables -I OUTPUT -d www.baidu.com -j REJECT
```

让主机无法访问www.baidu.com这个地址

```bash
iptables -I OUTPUT -d www.baidu.com -p icmp -j DROP
```

让主机无法ping通www.baidu.com，但可以访问

## filter 表 FORWARD 链

```bash
iptables -A FORWARD -s 172.17.0.2 -d 172.17.0.3 -j DROP
```

禁止来自172.17.0.2的数据发送给172.17.0.3

```bash
iptables -I FORWARD -i docker0 -o docker0 -j DROP
```

禁止容器间互相访问

```bash
iptables -I FORWARD -i docker0 -o wlp2s0 -p tcp --dport 80 -j DROP
```

禁止容器访问外网http协议的网站，但可以访问https协议的网站

## nat 表转发

```bash
iptables -t nat -A OUTPUT -p tcp --dport 1080 -j DNAT --to-dest 127.0.0.1:8000
```

使用nat表的OUTPUT链来做本地端口转发，使用tcp协议，目的端口是1080的流量全都转发到8000端口

```bash
iptables -t nat -I PREROUTING -p tcp -d 192.168.0.110 --dport 1080 -j DNAT --to-dest 192.168.0.110:8000
```

使用nat表的PREROUTING链来令远程访问本地1080端口的流量转发到本地的8000端口

```bash
iptables -t nat -I PREROUTING -p tcp --dport 8080 -j DNAT --to-dest 10.0.52.190:8030
```

```bash
iptables -t nat -I POSTROUTING -d 10.0.52.190 -p tcp --dport 8030 -j SNAT --to-source 10.72.19.213
```

通过PREROUTING和POSTROUTING链来做正向代理

## 具体使用场景

在使用 iptables 之前，要先确保 iptables 服务已经启用，`systemctl start iptables.service`

* 容器运行时未暴露端口，又想让别人能通过本机 ip 访问到服务（假设本机 ip 是 10.72.19.213， 容器 ip 是 172.17.0.2）

  ```
  iptables -t nat -I PREROUTING -p tcp --dport 8080 -j DNAT --to-dest 172.17.0.2:8080
  ```
  
  ```
  iptables -t nat -I POSTROUTING -d 172.17.0.2 -p tcp --dport 8080 -j SNAT --to-source 10.72.19.213
  ```

  上面两条规则设置的效果是从别的机器上访问 10.72.19.213:8080 会被转发到 172.17.0.2:8080，也就是容器里的服务。不过只能从别的机器上访问才有效。
