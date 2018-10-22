+++
title = "Connection Reset Error"
date = 2018-10-19T10:03:25Z
draft = false
tags = ["k8s", "network"]
categories = ["solved"]
+++

# k8s 应用接口请求 connection reset 错误

测试人员在进行压力测试时发现应用A的接口出现了 connection reset 的错误，出错率大概为十分之一，猜想可能是代码问题或是网络问题或是连接数限制问题。

## 问题排查

应用A有三个环境，dev，uat和prod。其中dev和uat在同一集群中，因此网络环境相同，在代码上，三个环境都是一样的。

* 测试prod环境的同一接口，并没有出现相同错误，说明代码没有问题。
* 如果是连接数限制问题，那么应该不止此次压测出现，而之前几次压测都没有出现改问题，所以暂时先排除。
* 验证网络问题，测试应用B的一个静态文件请求，也发现了相同的错误，现在基本可以确定是网络问题。

## 原因查找

要想排查网络问题，要先了解一下系统的网络架构。

首先最外面是一个A10负载均衡，80端口代理到k8s集群三个master节点的80端口，所有的域名都解析在这个A10上。

三台master节点的ip地址和80端口被用作集群中ingress controller的service的externalIP，域名通过ingress controller找到对应的应用。

网络问题需要一层一层排查，首先是应用本身。用循环来发送100次请求，查看应用日志：

```bash
for i in  {1..100}; do curl http://www.test.com/api/example; echo $i;done
```

通过日志发现请求出现connection reset时，应用没有对应日志，说明请求没有到应用这里。

应用上一层是域名，域名是通过ingress来配置的，查看ingress controller的日志，发现也没有报错日志，所以请求也没有到这里。

接下来查看三台master节点的80端口，发现其中一台master1的80端口不通。看来问题应该就出现在这里了，我们可以手动来验证一下。

将要请求的域名映射为master2的ip地址，在`/etc/hosts`中加入`www.test.com master2IP`，进行测试，发现没有出现错误。改成master1的ip地址则发现无法连接。

## 问题解决

查看了k8s集群的网络组件，发现master1上的flannel一直处于container creating状态。将pod删除重启，再次进行测试，发现connection reset的错误已经没了。
