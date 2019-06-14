+++
title = "Ssh Config"
date = 2019-06-14T17:22:12+08:00
draft = false
tags = ["ssh"]
categories = ["solved"]
+++

# ssh 错误排查

新拿到的6台服务器，通过[jumpserver](https://github.com/jumpserver/jumpserver)用密钥登录到其中一台服务器，用 ssh 以账户密码的方式登录到其中另外一台服务器时遇见如下错误:

```
Permission denied (publickey,gssapi-keyex,gssapi-with-mic).
```

测试登录另外一台服务器，发现可以正常登录；测试登录自己，报相同的错误。可以判断应该是 ssh 服务端配置有问题。  
经过排查，发现应该是服务端没有开启密码认证，修改`/etc/ssh/sshd_config`，修改为如下配置，将`no`替换为`yes`:

```
PasswordAuthentication yes
```

保存配置重新启动 sshd 服务:

```
systemctl restart sshd
```

再次测试发现已经可以登录了
