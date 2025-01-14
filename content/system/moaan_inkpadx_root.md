+++
title = "Moaan InkpadX Root"
summary = "Moaan InkpadX root"
date = 2025-01-14T09:24:15Z
draft = false
tags = ["android", "eink", "root"]
categories = ["system"]
+++

# Moaan InkpadX Root

手头的 Moaan InkpadX 是一个拥有 10 英寸墨水屏，搭载了 Android 8.1 的安卓电子书阅读器。

就目前而言，想要比较简单的 root 安卓设备，那就是使用 [Magisk](https://github.com/topjohnwu/Magisk)。但是要用它来 root 的前提是需要 boot.img，那我们首要的任务就是获取到 boot.img。

官网搜索一番发现没有提供系统镜像，系统升级也已经是最新版本（估计公司已经放弃这款产品了，买来就升级过一次。如果有升级包可能里面会有 boot.img）。网上搜索一番也没有找到相关的 root 记录，估计也是太过小众的电子产品，但是找到了一个 [inkpalm5](https://github.com/qwerty12/inkPalm-5-EPD105-root.git)的 root 方案。

看了一下这个设备和我的 InkpadX 是同一个公司的产品，连 CPU 型号也是一样的。这个设备也是用的 Magisk 来获取 root 权限。他获取到 boot.img 的原理是这款设备的 OTA 更新包的签名为 Google 公开的测试密钥（估计是开发人员工期紧没那么多精力来考虑安全问题），所以可以自己创建一个更新包来更新设备。作者写了一个更新包用于提取 boot.img。我猜测这都是同一个公司的产品，估计我的 InkpadX 的更新包也是用的测试密钥。

## 获取 boot.img

前置环境配置，打开设备调试模式，安装 adb 之类的就不说了。

根据文档所说的原理，提供的[dump_kernel_to_system_signed.zip](https://github.com/qwerty12/inm-5-EPD105-root/raw/main/du_mpkernel_t_o_systemsigned.zip)在我的 InkpadX 上同样适用。将 InkpadX 连接上电脑，选择文件传输模式，电脑上应该可以通过 `adb devices -l` 看到 InkpadX 设备，执行

```bash
adb reboot recovery
```
设备将会重新启动进入到恢复模式。选择 `Update from adb`，设备会等待电脑端传输更新包。在电脑端应该也能识别到设备（我的 linux 由于 udev 规则问题需要用 root 权限来操作），通过

```bash
adb sideload dump_kernel_to_system_signed.zip
```
将更新包传到设备上，设备会自动安装更新，这个更新包会将 boot 分区写入到 `/system/bimg.img` 镜像文件。更新安装完成后重启设备。

## patch boot.img

等待设备重启成功后，电脑端通过

```bash
adb cp /system/bimg.img /sdcard/boot.img
```

将 `boot.img` 复制到 `/sdcard/` 目录下。去 Magisk 的 [releases](https://github.com/topjohnwu/Magisk/releases) 页面下载 apk 并通过

```bash
abb install xxx.apk
```
安装到设备上（我因为想要修改图标需要重新打包签名下载的 debug 版本，release 版本的二进制文件会校验安装包的签名）。接下来就是给 boot.img 打补丁。

设备上打开 Magisk，点击安装，选项 `保留 AVB/dm-verity` 不用勾选，直接点击下一步。选择刚刚提取的 `boot.img` 点击开始，Magisk 会新生成一个 img 文件。

## 制作更新包

克隆项目 [inkPalm-5-EPD105-root](https://github.com/qwerty12/inkPalm-5-EPD105-root.git) 到本地，我们需要用他提供的更新包模板新建一个更新包（我试了 fastboot boot 命令测试启动修改的镜像发现会卡住，所以不敢直接 fastboot flush 写入，作者也没有尝试过，稳妥起见还是采用更新包的方式来写入）。

用 `adb pull` 将 Magisk 刚刚生成的镜像文件拉取到电脑端，放到刚刚克隆的项目下，重命名为 `boot.img`，将这个镜像添加到压缩包 `kernel_flashing_template.zip`，我用的是 7z 命令

```
7z u kernel_flashing_template.zip boot.img
```

然后签名

```bash
java -jar signapk-1.0.jar -w testkey.x509.pem testkey.pk8 kernel_flashing_template.zip kernel_flashing_template_signed.zip
```
 
## 写入 boot.img

再次将设备重启到恢复模式

```bash
adb reboot recovery
```
选择 `Update from adb`，电脑端传输刚刚建好的更新包

```bash
adb sideload kernel_flashing_template_signed.zip
```

设备会自动安装更新，更新完选择重启设备。等待重启完成，电脑上执行 `adb shell su` 后，Magisk 应该会询问获取 root 权限，至此就 root 成功了。

如果想要取消 root，只需要卸载 Magisk 并且重启即可。

参考文档：

> [inkpalm5 root](https://github.com/qwerty12/inkPalm-5-EPD105-root/blob/main/README.md)
