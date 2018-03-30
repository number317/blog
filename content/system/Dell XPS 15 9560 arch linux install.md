+++
title = "Dell XPS 15 9560 Arch Linux Install"
date = 2018-03-28T10:18:00+08:00
draft = true
tags = ["archlinux, xps15, 9560"]
categories = ["system"]
+++

# Dell XPS 15 9560 Arch Linux 安装教程

## BIOS设置


打开电脑，等待出现dell图标时按下`F12`键，选择进入BIOS设置页面，进行如下操作

1. 将`SATA Mode`从默认的`RAID`模式修改为`AHCI`模式。这样可以允许Linux检测到`NVME SSD`。
2. 将`Fastboot`的选项从`POST Behaviour`修改为`Thorough`，这样可以防止偶尔的启动错误。
3. 关闭安全启动来允许linux启动。

保存后退出，会重启电脑。

## 内核启动参数设置

从U盘启动 Arch Linux 引导镜像：在dell图标出现时按下`F12`，选择从U盘启动，在出现启动菜单时，按下`e`键，添加以下启动参数：

```conf
initrd=\initramfs-linux.img root=/dev/sdb2 acpi_rev_override=1 pci=nommconf nouveau.modeset=0
```

这样可以保证系统可以正常关闭和重启，否则关闭和重启时电脑会死机。

## 系统安装

首先由于4k屏的高分辨率，使得终端字体非常小，应该设置大一点的字体：

```bash
setfont latarcyrheb-sun32
```



参考文档：

[内核参数](https://wiki.archlinux.org/index.php/Kernel_parameters#systemd-boot)

[前人安装经验](https://github.com/grobgl/arch-linux-setup/blob/master/install.txt)

[9560 archwiki](https://wiki.archlinux.org/index.php/Dell_XPS_15_9560#Suspend_and_Hibernate)
