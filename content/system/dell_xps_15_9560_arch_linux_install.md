+++
title = "Dell Xps 15 9560 Arch Linux Install"
date = 2018-03-28T10:18:12+08:00
draft = false
tags = ["archlinux", "xps15"]
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

### tty字体设置
首先由于4k屏的高分辨率，使得终端字体非常小，应该设置大一点的字体：

```bash
setfont latarcyrheb-sun32
```

### 网络连接

```bash
wifi-menu
```

根据提示选择wifi，输入密码即可。

### 分区

这里采用lvm并使用cryptsetup来加密磁盘，最终分区如下：

```bash
NAME                      MAJ:MIN RM   SIZE RO TYPE  MOUNTPOINT
nvme0n1                   259:0    0   477G  0 disk  
├─nvme0n1p1               259:1    0   512M  0 part  /boot
└─nvme0n1p2               259:2    0 476.4G  0 part  
  └─luks                  254:0    0 476.4G  0 crypt 
    ├─entropy--vg0-root   254:1    0   150G  0 lvm   /
    ├─entropy--vg0-home   254:2    0   250G  0 lvm   /home
    ├─entropy--vg0-swap   254:3    0    16G  0 lvm   [SWAP]
    └─entropy--vg0-backup 254:4    0    10G  0 lvm   
```

磁盘创建两个分区，一个分区用于`/boot`，另一个分区用于安装系统。

```bash
cgdisk /dev/nvm0n1
```

输入命令后按照提示进行分区。通常`/boot`分区512M就够用了，剩下的分区都用于系统安装。

### 加密磁盘

```bash
cryptsetup luksFormat /dev/nvme0n1p2
cryptsetup open /dev/nvme0n1p2 luks
```

注意提示，输入的yes必须是大写的

### 创建lvm分区

```bash
pvcreate /dev/mapper/luks
vgcreate entropy-vg0 /dev/mapper/luks
lvcreate -L 250G entropy-vg0 --name home
lvcreate -L 150G entropy-vg0 --name root
lvcreate -L 16G entropy-vg0 --name swap
lvcreate -L 10G entropy-vg0 --name backup
```

`home`用于挂载`home`目录，`root`用于挂载根目录，`swap`用于交换空间，`backup`用于备份系统，必要时可还原。

### 根式化分区

将`boot`分区格式化为fat32格式

```bash
mkfs.fat -F32 /dev/nvme0n1p1
```

将`root`，`home`，`backup`分区格式化为ext4格式

```bash
mkfs.ext4 /dev/mapper/entropy--vg0-root
mkfs.ext4 /dev/mapper/entropy--vg0-home
mkfs.ext4 /dev/mapper/entropy--vg0-backup
```

格式化`swap`分区

```bash
mkswap /dev/mapper/entropy--vg0-swap
```


### 挂载分区

挂载各个分区，`backup`分区可以先不挂载：

```bash
mount /dev/nvme0np1 /mnt/boot
mount /dev/mapper/entropy--vg0-root /mnt
mkdir -p /mnt/{home,boot}
mount /dev/mapper/entropy--vg0-home /mnt/home
```

启用swap分区：

```bash
swapon /dev/mapper/entropy--vg0-swap
```

### 安装基本系统

```bash
pacstrap /mnt base base-devel
```

### 生成fstab

```bash
genfstab -L /mnt >> /mnt/etc/fstab
```

### SSD 参数优化

`/etc/fstab`的参数设置如下：

```fstab
# Static information about the filesystems.
# See fstab(5) for details.

# <file system> <dir> <type> <options> <dump> <pass>
# /dev/mapper/entropy--vg0-root UUID=9ce33c90-5f31-4e3c-9dfc-f79d91b0ca97
/dev/mapper/entropy--vg0-root   /               ext4            rw,noatime,discard,data=ordered 0 1

# /dev/nvme0n1p1 UUID=5D44-7907
/dev/nvme0n1p1          /boot           vfat            rw,relatime,fmask=0022,dmask=0022,codepage=437,iocharset=iso8859-1,shortname=mixed,errors=remount-ro       0 2

# /dev/mapper/entropy--vg0-home UUID=8beacae1-5f69-4704-b336-d75e30e0607d
/dev/mapper/entropy--vg0-home   /home           ext4            rw,noatime,discard,data=ordered 0 2

# /dev/mapper/entropy--vg0-swap UUID=bb0ce28e-3293-4228-a40f-72b42a72617d
/dev/mapper/entropy--vg0-swap   none            swap            defaults        0 0
```

如果 `/usr` 配置了单独的分区，需要将 /usr 分区最后一项配置设为 0 0。并且在 Hooks 里添加 usr 模块。

SSD的参数优化具体可以参考[archwiki](https://wiki.archlinux.org/index.php/Solid_State_Drive)

### 切换到新系统

```bash
arch-chroot /mnt
```

### 设置时间

```bash
ln -sfv /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
hwclock --systohc --utc
```

### 设置语言

本地化的程序与库若要本地化文本，都依赖 Locale, 后者明确规定地域、货币、时区日期的格式、字符排列方式和其他本地化标准等等。在下面两个文件设置：locale.gen 与 locale.conf. 

/etc/locale.gen是一个仅包含注释文档的文本文件。指定您需要的本地化类型，只需移
除对应行前面的注释符号（＃）即可，建议选择帶UTF-8的項： 

```bash
vi /etc/locale.gen

en_US.UTF-8 UTF-8
zh_CN.UTF-8 UTF-8
zh_TW.UTF-8 UTF-8
```

接着执行locale-gen以生成locale讯息： 

```bash
locale-gen
```

创建 locale.conf 并提交您的本地化选项： 

```bash
echo LANG=en_US.UTF-8 > /etc/locale.conf
```

### 设置终端字体

```bash
echo 'FONT=latarcyrheb-sun32' >> /etc/vconsole.conf
```

### 修改root密码

```bash
passwd
```

### 创建普通用户

```bash
useradd -m -g users -G wheel -s /bin/bash <username>
passwd cheon
```

赋予用户执行所有命令的权限：

```bash
vi /etc/sudoers
```

添加`<username> ALL=(ALL) ALL`到该文件中。

### 设置主机名

```bash
echo <hostname> > /etc/hostname
```

### 配置启动加载模块

编辑`/etc/mkinitcpio.conf`，修改对应项至如下所示：

```bash
MODULES=(ext4 dm_snapshot)
HOOKS=(base systemd udev autodetect modconf block sd-vconsole sd-encrypt sd-lvm2 filesystems keyboard fsck)
```

### 生成初始化镜像

```bash
mkinitcpio -p linux
```

### 安装启动器

```bash
bootctl --path=/boot install
pacman -S intel-ucode
```

首先我们需要在/boot/loader/entries文件夹中创建名为arch.conf的配置文件，添加如下内容：

```conf
title	Arch Linux
linux	/vmlinuz-linux
initrd	/intel-ucode.img
initrd	/initramfs-linux.img
options	luks.uuid=417dd162-dd0b-4434-bc29-2b6daa8f3593 luks.name=417dd162-dd0b-4434-bc29-2b6daa8f3593=luks root=/dev/mapper/entropy--vg0-root rw acpi_rev_override=1 nouveau.modeset=0 pci=nommconf rd.luks.options=discard
```

大致意思，各位根据名字应该就能猜个大概，这里只需要注意root部分可以填写UUID，要查看UUID，可以使用`lsblk -f`，这里还加入了一些参数，是为了xps15能够正常关机。

接下来需要配置/boot/loader/loader.conf，这个文件有默认的内容，只需要修改下即可。

```bash
timeout 0
default arch
```

### 安装连接wifi所需工具

```bash
pacman -S dialog wpa_supplicant
```

### 退出chroot并重启

```bash
exit
reboot
```

能正常重启说明系统已经安装完成

## 桌面安裝

### 驱动安装

*   声卡

        pacman -S pulseaudio

*   显卡

        pacman -S xf86-video-intel

*   触摸板可用libinput和synaptics，这里采用libinput。

### 常用软件安装

* xorg

        pacman -S xorg-server xorg-xinit

* 窗口管理器

        pacman -S herbstluftwm dzen2

* 窗口合成器

        pacman -S compton

* 启动器

        pacman -S dmenu

* 终端

        pacman -S rxvt-unicode

* 常用工具

        pacman -S git gvim gdb \
                  neofetch feh scrot \
                  slock xautolock \
                  docker \
                  ranger zathura zathura-pdf-mupdf \
                  w3m p7zip tree irssi \
                  mplayer mpd mpc \
                  firefox thunderbird libreoffice\
                  openssh sshpass openvpn \
                  xorg-xset xorg-xbacklight xorg-xrandr xorg-xprop

### 软件配置

系统的dotfile存放在了[github](http://github.com/number317/dotfile.git)上，针对各软件的HiDPI等设置可以参考[archwiki](https://wiki.archlinux.org/index.php/HiDPI)，遇见其他一些问题也可以通过archwiki来查找解决方案。

![neofetch](/system/images/xps15_img1.jpg)

参考文档：

> [内核参数](https://wiki.archlinux.org/index.php/Kernel_parameters#systemd-boot)
> 
> [前人安装经验](https://github.com/grobgl/arch-linux-setup/blob/master/install.txt)
> 
> [9560 archwiki](https://wiki.archlinux.org/index.php/Dell_XPS_15_9560#Suspend_and_Hibernate)
