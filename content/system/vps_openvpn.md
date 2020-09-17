+++
title = "Vps Openvpn"
date = 2018-04-28T15:22:21+08:00
draft = false
tags = ["vpn"]
categories = ["system"]
+++

# VPS OpenVPN 翻墙教程

## 服务端配置

首先，需要一台能访问外网的服务器。这里采用的是HostUS的VPS。

在部署OpenVPN服务端之前，应该先打开服务器的ip转发功能。修改`/etc/sysctl.conf`文件，将对应内容修改为下面一行的值：

```conf
net.ipv4.ip_forward = 1
```

修改后执行`sysctl -p /etc/sysctl.conf`使配置生效。

服务端采用容器部署，因此VPS应该先安装好docker。以下为容器启动脚本：

```bash
#!/bin/bash
IP="xxx.xxx.xxx.xxx"
OVPN_DATA="/root/ovpn_data"
docker run -v $OVPN_DATA:/etc/openvpn --rm kylemanna/openvpn ovpn_genconfig -u udp://$IP
docker run -v $OVPN_DATA:/etc/openvpn --rm -it kylemanna/openvpn ovpn_initpki
docker run -v $OVPN_DATA:/etc/openvpn --name openvpn -e DEBUG=1 -d -p 1194:1194/udp --cap-add=NET_ADMIN kylemanna/openvpn
docker run -v $OVPN_DATA:/etc/openvpn --rm -it kylemanna/openvpn easyrsa build-client-full CLIENTNAME nopass
docker run -v $OVPN_DATA:/etc/openvpn --rm kylemanna/openvpn ovpn_getclient CLIENTNAME > CLIENTNAME.ovpn
```

将上述脚本的IP地址替换为自己的IP地址，然后执行脚本，根据提示输入信息即可。中间要求输入密码之类的都写个简单点一样的密码就好。

脚本执行完成后会生成一个`CLIENTNAME.ovpn`客户端的配置文件，将它下载到自己的电脑上，用于配置客户端。

## 客户端配置

这里的客户端也archlinux为例，要先安装好openvpn，在此不做赘述。客户端直接执行以下命令连接OpenVPN服务端：

```bash
sudo openvpn CLIENTNAME.ovpn
```

如果日志输出有报错，可以查看服务端的配置文件，修改相应部分。启动好后进行测试：

```bash
ping -c 3 www.baidu.com
ping -c 3 www.google.com
```

如果无法解析域名可能是DNS服务器没有设置好，查阅资料可知，openvpn客户端命令行不会从服务端拉取DNS设置。我们可以手动进行设置，在`/etc/resolv.conf`文件中第一行添加`namespace 8.8.8.8`，再次进行测试应该就可以解析域名了，用`curl`进行请求也能够请求成功了。

虽然可以翻墙了，但是如果你连着内网，要访问内网的服务，由于openvpn为了进行全局代理，修改了路由表，所有的流量都会走openvpn的路线，可能需要自己设置一下路由表。

```bash
sudo ip route add xxx.xxx.xxx/24 via xxx.xxx.xxx.xxx
```

第一个ip地址是你要访问的内网网段，第二个ip地址是网关，你可以在openvpn客户端启动前用`ip route list`来查看网关信息。

以上就设置完了客户端和服务端的openvpn，现在既可以翻墙也可以连内网的服务，但是每次启动都要输入这么多命令比较麻烦，所以我们现在来整合一下。

## openvpn service 配置

我们通过systemctl来控制openvpn，将`CLIENTNAME.ovpn`移动到`/etc/openvpn/client/client.conf`，在`/etc/openvpn/client/`文件夹下创建`start.sh`和`stop.sh`脚本：

start.sh:

```bash
#!/bin/bash

router-set(){
    ip route add 192.0.6/24 via 192.72.19.254
    ip route add 192.0.52/24 via 192.72.19.254
    ip route add 192.79.21/24 via 192.72.19.254
}

dns-set(){
    sed -i "/resolvconf/a \nameserver 8.8.8.8" /etc/resolv.conf
}

main(){
    if netctl list | grep \* | grep -q Employ; then
        router-set
    fi
    dns-set
    echo start!
}

main
```

stop.sh:

```bash
#!/bin/bash
router-clear(){
    ip route delete 192.0.6/24 via 192.72.19.254
    ip route delete 192.0.52/24 via 192.72.19.254
    ip route delete 192.79.21/24 via 192.72.19.254
}

dns-clear(){
    sed -i "/ameserver 8.8.8.8/d" /etc/resolv.conf
}

main(){
    if netctl list | grep \* | grep -q Employ; then
        router-clear
    fi
    dns-clear
    echo stop!
}

main
```

为这两各脚本添加可执行权限：

```bash
sudo chmod +x *.sh
```

在`client.conf`文件中添加以下内容：

```bash
script-security 2
up /etc/openvpn/client/start.sh
down /etc/openvpn/client/stop.sh
```

以上内容使openvpn启动时执行`start.sh`，停止时执行`stop.sh`

现在可以使用`sudo systemctl start openvpn-client@client.service`和`sudo systemctl stop openvpn-client@client.service`来启动和停止openvpn服务。
