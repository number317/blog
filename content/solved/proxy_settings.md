+++
title = "Proxy Settings"
date = 2019-12-16T16:40:16+08:00
draft = false
tags = ["proxy"]
categories = ["solved"]
+++

# Table of Contents
<!-- vim-markdown-toc GitLab -->

+ [常见代理设置](#常见代理设置)
    * [git](#git)
    * [npm](#npm)
    * [pip](#pip)

<!-- vim-markdown-toc -->

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

删除代理:

```bash
npm config delete registry
```

## pip

编辑 `$HOME/.pip/pip.conf`:

```
[global]
timeout = 6000
index-url = http://pypi.douban.com/simple/
[install]
use-mirrors = true
mirrors = http://pypi.douban.com/simple/
trusted-host = pypi.douban.com
```
