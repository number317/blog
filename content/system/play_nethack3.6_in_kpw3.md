+++
title = "Play Nethack3.6 in KPW3"
summary = "summary"
date = 2026-01-09T16:36:02+08:00
draft = false
tags = ["kindle", "nethack", "eink", "cross-compile"]
categories = ["system"]
+++

# Play Nethack3.6 in KPW3

## 前提条件

1. KPW3 需要越狱，并且安装了 [`usbnetwork`](https://www.mobileread.com/forums/showthread.php?t=186645) 插件，可以通过 `ssh` 连接到 kindle 上
2. 编译的 nethack 是终端版本，所以需要安装 [`kterm`](https://github.com/bfabiszewski/kterm) 插件，用于运行 nethack

关于如何越狱 kindle 和安装插件，网上有很多教程，不再赘述

## 环境准备

为了保持系统整洁，我习惯上在容器中执行这种临时任务。由于 kindle 的 linux 版本比较老，所以我选择了 ubuntu:trusty，可以方便安装老版本的 gcc 等工具。

```bash
podman run -it --name kpw3 -v ~/Codes:/workspace ubuntu:trusty bash
```

先安装 arm 版本的 gcc 等工具，ncurses 是因为在代码里有用到 `ncurses.h`

```bash
apt update
apt install -y gcc-4.7-arm-linux-gnueabi make libncurses5-dev libncursesw5-dev
```

gcc 安装完成后，需要在系统中创建一些软链接，防止编译的时候找不到文件

```bash
ln -sfv /usr/arm-linux-gnueabi/lib/ld-linux.so.3 /lib/ld-linux.so.3
ln -sfv /usr/arm-linux-gnueabi/lib/libc.so.6 /lib/libc.so.6
ln -sfv /usr/arm-linux-gnueabi/lib/libc_nonshared.a /usr/lib/libc_nonshared.a
```

## 动态库提取

编译需要用到一些 kindle 的动态库文件，需要从 kindle 中提取出来，方法如下：

```bash
ssh root@<your kindle ip address>
cd /usr
tar -cpvzf /mnt/us/libs.tar.gz lib
scp root@<your kindles ip address>:/mnt/us/libs.tar.gz .
```

<details>
<summary>将提取的动态库文件拷贝到容器中，并做一些软链接：</summary>

```bash
podman cp lib.tar.gz kpw3:/root

tar -xzvf lib.tar.gz
mv lib kindle_libs

cd kindle_libs

rm libglib-2.0.so
rm libglib-2.0.so.0
ln -s libglib-2.0.so.0.2918.0 libglib-2.0.so
ln -s libglib-2.0.so.0.2918.0 libglib-2.0.so.0
rm libgio-2.0.so
rm libgio-2.0.so.0
ln -s libgio-2.0.so.0.2918.0 libgio-2.0.so
ln -s libgio-2.0.so.0.2918.0 libgio-2.0.so.0
rm libgobject-2.0.so
rm libgobject-2.0.so.0
ln -s libgobject-2.0.so.0.2918.0 libgobject-2.0.so
ln -s libgobject-2.0.so.0.2918.0 libgobject-2.0.so.0
rm libffi.so
rm libffi.so.5
ln -s libffi.so.5.0.10 libffi.so
ln -s libffi.so.5.0.10 libffi.so.5
rm libgmodule-2.0.so
rm libgmodule-2.0.so.0
ln -s libgmodule-2.0.so.0.2918.0 libgmodule-2.0.so
ln -s libgmodule-2.0.so.0.2918.0 libgmodule-2.0.so.0
rm libgthread-2.0.so
rm libgthread-2.0.so.0
ln -s libgthread-2.0.so.0.2918.0 libgthread-2.0.so
ln -s libgthread-2.0.so.0.2918.0 libgthread-2.0.so.0
ln -sf libncurses.so libtermlib.so
ln -sf libncurses.so.5 libtermlib.so.5
```

</details>

## 编译配置

先设置一些编译器信息

```bash
export CC=arm-linux-gnueabi-gcc-4.7
export LD=arm-linux-gnueabi-ld
export AR=arm-linux-gnueabi-ar
export RANLIB=arm-linux-gnueabi-ranlib
export STRIP=arm-linux-gnueabi-strip
```

为了方便 nethack 在运行时自动找到资源文件，要创建安装的目录，这个目录需要和 kindle 保持一致：

```bash
mkdir -p /mnt/us/downloads/nethack-3.6
```

修改 hints 文件，更改 `PREFIX` 为安装的目录以适配 KPW3:

<details>
<summary>git diff</summary>

```bash
git diff sys/unix/hints/unix
diff --git a/sys/unix/hints/unix b/sys/unix/hints/unix
index bd2ef8684..8e4826ac7 100644
--- a/sys/unix/hints/unix
+++ b/sys/unix/hints/unix
@@ -10,7 +10,7 @@
 # and Makefiles.


-PREFIX=/usr
+PREFIX=/mnt/us/downloads/nethack-3.6
 HACKDIR=$(PREFIX)/games/lib/$(GAME)dir
 INSTDIR=$(HACKDIR)
 VARDIR=$(HACKDIR)

```

</details>

运行配置，使用最简单的unix配置，生成Makefile

```bash
sh sys/unix/setup.sh sys/unix/hints/unix
```

修改 src/Makefiles，添加 kindle_libs 的路径，将 `-ltermlib` 修改为如下： 

```bash
WINTTYLIB=-ltermlib -L /root/kindle_libs
```

修改 include/config.h，配置存档的压缩方式，以适配 kindle 存在的压缩工具：

<details>
<summary>`git diff`</summary>

```bash
diff --git a/include/config.h b/include/config.h
index b606b5db1..db0b0f948 100644
--- a/include/config.h
+++ b/include/config.h
@@ -263,11 +263,11 @@

 #if defined(UNIX) && !defined(ZLIB_COMP) && !defined(COMPRESS)
 /* path and file name extension for compression program */
-#define COMPRESS "/usr/bin/compress" /* Lempel-Ziv compression */
-#define COMPRESS_EXTENSION ".Z"      /* compress's extension */
+/* #define COMPRESS "/usr/bin/compress" */ /* Lempel-Ziv compression */
+/* #define COMPRESS_EXTENSION ".Z" */     /* compress's extension */
 /* An example of one alternative you might want to use: */
-/* #define COMPRESS "/usr/local/bin/gzip" */ /* FSF gzip compression */
-/* #define COMPRESS_EXTENSION ".gz" */       /* normal gzip extension */
+#define COMPRESS "/bin/gzip" /* FSF gzip compression */
+#define COMPRESS_EXTENSION ".gz" /* normal gzip extension */
 #endif

 #ifndef COMPRESS
```

</details>

## 编译安装

```bash
make
make install
```

执行完成后，可以在 `/mnt/us/downloads/nethack-3.6/` 中找到编译生成的文件。

将整个 `nethack-3.6` 目录拷贝到 kindle 上的 `/mnt/us/downloads` 。

```bash
podman cp -r /mnt/us/downloads/nethack-3.6 .
scp -r nethack-3.6 root@<your kindle ip address>:/mnt/us/downloads
```

## 相关配置

为了在 `kterm` 中方便运行，可以创建一个软链接:

```bash
mntroot rw
cd /mnt/us/downloads/nethack-3.6
ln -s /mnt/us/downloads/nethack-3.6/games/nethack /usr/local/bin/nethack
```

nethack 推荐的最小终端列数是 80，测试下来可以用 `Maple Mono` 的 5 号字体，这样有 82 列宽，可以完整显示 nethack 界面。

为了方便启动，可以修改下 `kterm` 的 `menu.json`：

```json
{
    "items": [
        {
            "name": "Kterm",
            "priority": 0,
            "items": [
                {"name": "Kterm", "priority": 1, "action": "bin/kterm.sh"},
                {"name": "maple-mono", "priority": 2, "action": "bin/kterm.sh -f 'Maple Mono' -s 5"}
            ]
        }
    ]
}
```

字体文件可以上传到 kindle 的 `/mnt/us/downloads/fonts` 目录下，然后在 `/usr/share/fonts` 中创建一个软链接，再更新字体缓存：

```bash
ln -sfv /mnt/us/downloads/fonts /usr/share/fonts/root
fc-cache -r
```

由于 kpw3 的 eink 屏幕，nethack 的配置也需要修改，禁用颜色：

```config
OPTIONS=number_pad:0

OPTIONS=hilite_pet,lit_corridor,boulder:0
OPTIONS=showexp
OPTIONS=time
OPTIONS=autodig,autopickup,pickup_types:$

OPTIONS=windowtype:tty,toptenwin,symset:DECgraphics
OPTIONS=fixinv,safe_pet,sortpack,tombsto
OPTIONS=verbose,news
OPTIONS=msghistory:500,msg_window:reversed
OPTIONS=hilite_status:characteristics/up/green/down/red

MSGTYPE=hide "You swap places with .*"
MSGTYPE=hide "You stop[^!]*is in the way!"
MSGTYPE=hide "You hear crashing rock."
MSGTYPE=hide "A mysterious force prevents the tengu from teleporting!"
MSGTYPE=norep "You see here a .*"
MSGTYPE=norep "You see here an .*"
MSGTYPE=norep "You start digging.  You hit the rock with all your might.  You succeed in cutting away some rock."
MSGTYPE=stop "You are slowing down."
MSGTYPE=stop "You find it hard to breathe."
MSGTYPE=stop "You are turning a little .*"
```

最后来一个游戏截图：

![nethack-3.6](/system/images/play_nethack3.6_in_kpw3_img1.png)
