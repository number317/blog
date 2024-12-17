+++
title = "Proxy Settings"
date = 2019-12-16T16:40:16+08:00
draft = false
tags = ["proxy"]
categories = ["solved"]
+++

# 常见代理设置

## git

```bash
git config --global http.proxy http://ip:port
git config --global https.proxy http://ip:port
```

或者编辑 `$HOME/.gitconfig`:

```
[http]
    proxy = http://ip:port
[https]
    proxy = http://ip:port
```

删除代理:

```bash
git config --global --unset http.proxy
git config --global --unset https.proxy
```

git 也支持 socks5 代理，把 `http` 替换为 `socks5` 即可。

## npm

临时代理:

```bash
npm --registry=https://registry.npm.taobao.org install
```

全局配置:

```bash
npm config set registry https://registry.npm.taobao.org
```

或者编辑 `$HOME/.npmrc`:

```
registry=https://registry.npm.taobao.org
```

pathonjs

```bash
npm install --phantomjs_cdnurl=http://npm.taobao.org/dist/phantomjs/
```

electron

```bash
npm install --electron_cdnurl=https://npm.taobao.org/mirrors/electron
```

删除代理:

```bash
npm config delete registry
```

## pip

编辑 `$HOME/.pip/pip.conf`:

```
[global]
timeout = 6000
index-url = https://mirrors.ustc.edu.cn/pypi/simple/
[install]
use-mirrors = true
mirrors = https://mirrors.ustc.edu.cn/pypi/simple/
trusted-host = mirrors.ustc.edu.cn
```
