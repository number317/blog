+++
title = "LVM Intro"
date = 2018-01-26T15:27:50+08:00
draft = false
tags = ["LVM"]
categories = ["system"]
+++

# LVM 介绍

LVM(Logical Volume Management)逻辑卷管理利用linux内核的device-mapper特征来实现存储系统的虚拟化，操作系统不再直接操作磁盘，而是操作LV(Logical Volume)逻辑卷。

传统磁盘管理如GPT分区和MBR分区存在着磁盘分区无法动态扩展的缺点，即是增加新的磁盘也只能当作单独的文件系统使用，而无法为已在使用的分区增加空间。LVM正好解决了这个问题，可以动态地为分区扩容，而不影响上层系统的使用。

# LVM 基本概念

- PE(Physical Extend)：物理区域--逻辑卷管理的最小单位，默认大小为4M
- PV(Physical Volume)：物理卷--建立卷组的媒介，可以是磁盘，分区或者回环文件，物理卷包括一个特殊的header，其余部分被切割为一块块物理区域(physical extents)
- VG(Volume Group)：卷组--物理卷组成的组，可以被认为是PE池
- LV(Logical Volume)：逻辑卷--虚拟分区，由PE组成。组成LV的PE可以来自不同的磁盘

# LVM 工作流程

构造逻辑卷LV主要有3个步骤：

1. 将磁盘或分区条带化为PV(物理卷)，实际上是将磁盘或分区分割成一个个PE(物理区域)，默认大小是4M
2. 将PV组合成VG，VG中的PE供LV使用，创建VG时需要给VG命名，`/dev/`目录下会生成一个以VG名字命名的文件夹
3. 基于VG创建LV，LV也需要命名，LV创建好后会在对应的卷组目录下创建一个一LV名字命名的设备，该设备呈现给操作系统使用，可以格式化，当作正常的分区使用。

```graph
Physical disks
                
  Disk1 (/dev/sda):
     _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    |Partition1 50GB (Physical Volume) |Partition2 80GB (Physical Volume)     |
    |/dev/sda1                         |/dev/sda2                             |
    |_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ |_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ |
                                  
  Disk2 (/dev/sdb):
     _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    |Partition1 120GB (Physical Volume)                 |
    |/dev/sdb1                                          |
    | _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ __ _ _|

LVM logical volumes

  Volume Group1 (/dev/MyStorage/ = /dev/sda1 + /dev/sda2 + /dev/sdb1):
     _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ 
    |Logical volume1 15GB  |Logical volume2 35GB      |Logical volume3 200GB               |
    |/dev/MyStorage/rootvol|/dev/MyStorage/homevol    |/dev/MyStorage/mediavol             |
    |_ _ _ _ _ _ _ _ _ _ _ |_ _ _ _ _ _ _ _ _ _ _ _ _ |_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ |
```

如上图中有/dev/sda，/dev/sdb两个磁盘，sda有sda1和sda2两个分区，sdb有sdb1一个分区，三个分区都被条带化成了PV。三个PV组成了一个VG，名字是MyStorage，基于这个VG创建了三个LV，分别叫做rootvol，homevol，mediavol，在/dev/目录下也创建了相应的文件夹和设备。


