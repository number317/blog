+++
title = "Redhat Enable Ipv6"
date = 2018-01-26T14:43:54+08:00
draft = false
tags = ["ipv6"]
categories = ["system"]
+++

# RedHat设置开机启用ipv6

参照的系统信息：

```bash
$ lsb_release -a
LSB Version:    :core-4.1-amd64:core-4.1-noarch
Distributor ID: RedHatEnterpriseServer
Description:    Red Hat Enterprise Linux Server release 7.3 (Maipo)
Release:    7.3
Codename:   Maipo
```

首先查看系统是否开启了ipv6：

```bash
ifconfig | grep inet
```

或者

```bash
ip addr | grep inet
```

如果开启了，则应该有ipv6的字段：

```bash
inet 127.0.0.1/8 scope host lo
inet6 ::1/128 scope host 
inet 10.0.2.15/24 brd 10.0.2.255 scope global dynamic eth0
inet6 fe80::a00:27ff:fe3a:b67/64 scope link 
inet 192.168.33.10/24 brd 192.168.33.255 scope global eth1
inet6 fe80::a00:27ff:fef4:9024/64 scope link 
inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
inet6 fe80::42:9fff:fe3c:183e/64 scope link 
```

如果没有开启，则只有inet的字段：

```bash
inet 172.17.0.1  netmask 255.255.0.0  broadcast 0.0.0.0
inet 10.0.52.181  netmask 255.255.255.0  broadcast 10.0.52.255
inet 127.0.0.1  netmask 255.0.0.0
inet 10.130.2.1  netmask 255.255.254.0  broadcast 0.0.0.0
```

查看grub开机配置：

```bash
$ cat /etc/default/grub

GRUB_TIMEOUT=5
GRUB_DISTRIBUTOR="$(sed 's, release .*$,,g' /etc/system-release)"
GRUB_DEFAULT=saved
GRUB_DISABLE_SUBMENU=true
GRUB_TERMINAL_OUTPUT="console"
GRUB_CMDLINE_LINUX="ipv6.disable=1  rd.lvm.lv=vg_root/lv_root rd.lvm.lv=vg_root/lv_swap rhgb quiet net.ifnames=0 biosdevname=0 ipv6.disable=1"
GRUB_DISABLE_RECOVERY="true"
```

可以看到`ipv6.disable=1`，说明ipv6在启动时就已经被禁用了，把该项修改为0：

```bash
GRUB_TIMEOUT=5
GRUB_DISTRIBUTOR="$(sed 's, release .*$,,g' /etc/system-release)"
GRUB_DEFAULT=saved
GRUB_DISABLE_SUBMENU=true
GRUB_TERMINAL_OUTPUT="console"
GRUB_CMDLINE_LINUX="ipv6.disable=0  rd.lvm.lv=vg_root/lv_root rd.lvm.lv=vg_root/lv_swap rhgb quiet net.ifnames=0 biosdevname=0 ipv6.disable=0"
GRUB_DISABLE_RECOVERY="true"
```

重新生成grub的配置文件：

```bash
grub2-mkconfig -o /boot/grub2/grub.cfg
```

之后重启系统，再次查看网络情况即可发现ipv6已启用：

```bash
$ sudo reboot
$ ifconfig | grep inet
```

应该可以查看到inet6字样。
