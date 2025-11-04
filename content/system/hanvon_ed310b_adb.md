+++
title = "Hanvon Ed310B Adb"
summary = "summary"
date = 2025-07-12T20:42:07+08:00
draft = false
tags = ["android", "eink", "root"]
categories = ["categories"]
+++

# Hanvon Ed310B Adb

## 问题初现

最近入手了一个 13.3 寸的墨水屏设备，汉王的 ED310 PLUS，好多年前的电子产品了，买这一款主要是因为便宜，性价比高，拿来看看 pdf 完全够用。我拿到安卓设备的第一件事情就是打开设备的 adb。

设备没有 Android 原生设置的入口，但是可以安装软件。我电脑上下载了 `Termux` 后通过 USB 传输至设备，在设备上安装后打开执行 `am start com.android.settings` 打开了设置。

在设置中点击 `系统 -> 关于平板电脑` 看到 `Android 版本`，连点 7 次打开开发者模式。然后在开发者模式中打开 `USB 调试模式`。

至此我以为很轻松的就完成了，结果连接上电脑后，电脑显示 `unauthorized`，并且设备也没有弹出 RSA 授权弹窗……相当于 `adb` 完全不可用。

## 尝试解决

连接入电脑设备无弹窗，最先尝试的是换一条数据线，发现不管用，看来不是数据线的问题。

换了另外一台电脑，一样的 `unauthorized`。

撤销USB调试授权，经过尝试后重启设备发现也是无用，看来也不是这个问题。

经过一系列尝试都无法解决这个问题，那么问答大概率出在系统上了，也许是系统阉割了这部分功能或者功能受到了限制。要想解决这个问题还得找到问题的原因。

## 根因分析

搜索资料发现 Android 设备的 RSA 弹窗逻辑在 services 服务中，我在 `Termux` 中安装了 `ssh` 服务方便我在电脑上远程探索设备。

不知道设备上的 services 应用放在哪里，但是肯定在 `/system` 目录下，我们搜索一下：

<!-- {{{ 查找 services -->
<details>
<summary>查找 services</summary>

```shell
/system $ find . -name "service*"
find: ‘./lost+found’: Permission denied
./bin/service
./bin/servicemanager
./etc/init/servicemanager.rc
./framework/oat/arm/services.art
./framework/oat/arm/services.odex
./framework/oat/arm/services.vdex
./framework/services.jar
./framework/services.jar.prof
```

</details>
<!-- }}} -->

看起来操作系统使用了 `AOT（Ahead-of-Time）` 编译（即直接使用 odex 文件运行，而不是原始的 apk 和 dex），其中 `odex` 文件是优化后的 DEX 文件，通常用于加速启动速度。`vdex` 是验证后的 DEX 文件，包含未修改的 DEX 数据，用于 `ART（Android Runtime）` 运行时加载并优化。

根据文件名判断应该就是 `/system/framework/oat/arm/services.vdex` 文件了，从设备上复制到电脑上，使用 `vdexExtractor --ignore-crc-error -i services.vdex` 将 `vdex` 文件转换为 `dex` 文件。再用 `jadx-gui services_class.dex` 反编译 dex 文件。在 jadx-gui 中直接搜索 `UsbDebuggingManager` 可以找到 `com.android.server.usb.UsbDebuggingManager` 文件。

可以看到如下逻辑：

![BUILD_TYPE](/system/images/hanvon_ed310b_adb_img1.png)
![ListenToSocket](/system/images/hanvon_ed310b_adb_img2.png)
![UsbHandler](/system/images/hanvon_ed310b_adb_img3.png)

大致逻辑就是 `ro.build.type` 是 `user` 时系统会发送 `DENY` 信号，估计就是这个逻辑导致了授权弹窗不出现，直接拒绝了，而这个设备的 `/system/build.prop` 确实就是 `user`。

## 解决方案

现在知道了问题所在，那么解决方案有两种思路，一是修改 `ro.build.type` 的值，我在我的 inkpadx 上测试了这一点，结果直接导致设备开机后无法正常进入系统。幸好虽然卡住但是 adb 还能使用，修改回原值后重启恢复了，看来这个方法行不通。并且修改 `/system/build.prop` 也是需要 root 权限的。

另一个方法是我们直接跳过 RSA 授权，通过直接写入 ADB 公钥文件来解决问题。但是不确定是不是管用，只能测试下（因为不确定代码逻辑发送 DENY 信号是拒绝 RSA 弹窗还是直接拒绝 adb 连接）。但是这个操作也需要 root 权限……

所以现在的问题就变成了如何 root 设备了，并且还是在 adb 不可用的情况下……

刚刚查看 build.prop 就发现了这个设备 OTA 更新包大概率也是用的测试密钥签名的，参考我之前的 [Moaan InkpadX Root](/system/moaan_inkpadx_root/) root 方法，需要重启至恢复模式，但是现在用不了 `adb reboot recovery` 我们要解决的就是让 adb 可用，现在死锁了……

幸好经过我对设备的探索，发现开发者模式下有一个重启进入恢复模式的菜单，nice！

我重启后确实进入了恢复模式，结果发现触摸屏失效了……估计在这个模式下没有加载触摸屏的驱动。页面上提示用音量键切换菜单，但是这设备哪来的音量键，我通过外接鼠标键盘、尝试了设备上的各种组合键（设备总共两个按键，试了各种组合、长按）发现也无法切换菜单，只能说这个系统完善度不够啊，那这个方法现在也走不通了。

期间我又尝试了各种方法，甚至尝试了 `metaexploit` 工具来试试有没有漏洞能提权的，结果都没有成功。最后只能去研究系统自带的 OTA 更新功能，这个功能是汉王设备都有的功能，但是由于不知道他需要的 OTA 更新包的格式，所以一直没有去尝试，但现在也没有别的方法了。

首先在官网看看有没有这款设备的更新包，结果发现没有……这得是多小众的产品啊。只能找一个类似的墨水屏设备的更新包来分析了。我下载下来解压后发现有一个 `version` 文件是陌生的，别的好像都是标准的 OTA 升级包内容。我习惯性的 `cat version` 查看了一下（坏就坏在这里了）：

```shell
~/Downloads/update/ cat version
HWV1.10SYV1.78PHV1.00FHV1.00SYV1.78.42
```

看起来就是一些版本信息，根据我的设备提供的版本信息大致推断下：

- HWV1.10：HWV可能表示“HardWareVersion”，即硬件版本。数字 1.10 表示当前设备的硬件版本是 1.10。

- SYV1.78：SYV可能表示“SystemVersion”，即系统版本（或主版本号）。数字 1.78 表示升级包支持的系统版本是 1.78。

- PHV1.00：PHV可能是“PackageHardWareVersion”，即升级包针对硬件的最低版本要求。数字 1.00 表示该OTA升级包的硬件版本兼容要求为 1.00 或更高。

- FHV1.00：FHV可能是“FirmwareHardWareVersion”，即固件与硬件匹配的版本。数字 1.00 表示升级包的最低固件硬件版本要求为 1.00 或更高。

- SYV1.78.42：这里 SYV 再次出现，但似乎是表示升级后的完整系统版本号。数字 1.78.42 表示升级后的系统应该是 1.78.42。

根据设备提供的版本信息我很快就构造出来了一个 version 文件，版本信息是 `HWV10.00SYV1.00PHV1.00FHV1.00SYV1.00.09`，构建好一个提取 boot 镜像的升级包，点击升级。

升级界面出现了，设备显示了升级的动画，感觉要成功了。等了一会儿，升级出错了……

我就知道没这么简单，难道是版本写错了。我又尝试了其他版本号，一样的报错。

没办法了，看不到 adb logcat 日志，也不知道发生了什么，只能看下升级的代码逻辑了。找到了设备上升级相关的代码，依旧用 apktool 反编译出来。发现读取 version 的代码竟然是从指定字节开始读取的，难道这个 version 不是纯文本文件吗？我又用 `file --mime-type version` 查看了一下，显示是 `application/octet-stream` 确实不是纯文本，大意了。

使用 vim 用 xxd 模式查看 version 文件，发现文件中连续出现大量 0x00 字节。这些字节可能是用于占位或填充，目的是形成固定的内存布局或对齐。这种固定结构对解析器来说更容易处理。那就好办了，复制了一个 version 文件，改了其中的版本号，并且对齐长度。重新构建一个提取 boot 镜像的升级包。

这次总算升级成功了，也顺利提取出了 boot 镜像。在设备安装好 Magisk 后给 boot 镜像打补丁，再构建一个升级包，升级后系统 root 成功。

总算 root 成功了，将 `~/.android/adbkey.pub` 复制到设备上，测试下手动推送公钥是否可行：

```
su
cp /sdcard/adbkey.pub /data/misc/adb/adb_keys
chmod 640 /data/misc/adb/adb_keys
chown system:shell /data/misc/adb/adb_keys
```

然后重启设备，连接上电脑，adb 命令果然已经授权成功了，太艰难了。

## 总结

这次启用 adb 和 root 设备遇到了许多困难，一个困难解决了，又出现了另一个问题，但这正是折腾的乐趣所在。

这个设备 adb 启用后测试了 scrcpy 结果发现电脑上无画面出现，搜索了 issue 应该是硬件不支持。不能用就算了，起码看看 pdf 还是挺好用的。
