+++
title = "Openshift Restart Node"
date = 2018-03-08T18:09:41+08:00
draft = false
tags = ["openshift"]
categories = ["solved"]
+++

# openshift 节点无法连接集群

在openshift master 节点上执行`oc get node`:

```bash
$ oc get node
NAME      STATUS                        AGE
node1     NotReady,SchedulingDisabled   301d
master1   Ready                         308d
master2   Ready                         308d
master3   Ready                         308d
master4   Ready                         308d
master5   Ready                         31d
```

其中的node1状态为`NotReady,SchedulingDisabled`，改节点没有准备好，并且是无法调度的，其中无法调度是手动设置的：

```bash
$ openshift admin manage-node node1 --schedulable=false
```

重启`origin-node`服务，让节点重新连接集群：

```bash
$ systemctl restart origin-node
```

重新查看节点状态：

```bash
$ oc get node
NAME      STATUS                        AGE
node1     Ready,SchedulingDisabled      301d
master1   Ready                         308d
master2   Ready                         308d
master3   Ready                         308d
master4   Ready                         308d
master5   Ready                         31d
```

节点已经ready，再将其设置为可调度的：

```bash
$ openshift admin manage-node node1 --schedulable=true
```

# 疏散Pods

标记节点不可调度:

```bash
$ openshift admin manage-node <node> --schedulable=false
```

列出节点上所有的Pods,请再次确认:

```bash
$ oadm manage-node <node1> <node2> --evacuate --dry-run [--pod-selector=<pod_selector>]
```

疏散Pods:

```bash
$ oadm drain <node1> <node2>
```

如果无法疏散，可以强制疏散:

```bash
$ oadm drain <node1> <node2> --force
```

## 删除node调度

```bash
$ oc delete node <node>
```

进行确认:

```bash
$ oc get nodes
```

