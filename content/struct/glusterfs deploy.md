+++
title = "Glusterfs Deploy"
date = 2018-01-09T10:09:35+08:00
draft = false
tags = ["tags"]
categories = ["categories"]
+++

# glusterfs centos 部署

GlusterFS是一个开源的分布式文件系统，这里部署它主要为了解决文件存储的单点问题。

## 虚拟机配置

此处采用vagrant部署centos的虚拟机三台，box可以采用bento/centos7.2，配置文件如下：

```ruby
Vagrant.configure("2") do |config|
    (1..3).each do |i|
        config.vm.define "gluster-node#{i}" do |node|
            file_to_disk = "tmp/gluster_node#{i}_disk.vdi"
            node.vm.box = "centos-7.2"
            node.vm.hostname = "gluster-node#{i}"
            n = 100 +i
            node.vm.network "private_network", ip: "192.168.12.#{n}"
            node.vm.provider "virtualbox" do |vb|
                unless File.exist?(file_to_disk)
                    vb.customize ['createhd', '--filename', file_to_disk, '--size', 10 * 1024]
                    vb.customize ['storageattach', :id, '--storagectl', 'SATA Controller', '--port', 1, '--device', 0, '--type', 'hdd', '--medium', file_to_disk]
                end
                vb.name = "gluster-node#{i}"
                vb.cpus = 1
                vb.memory = 1024
            end
        end
    end
end
```

该配置文件根据官方[quick start](http://docs.gluster.org/en/latest/Quick-Start-Guide/Quickstart/)文档，为虚拟机配置了第二磁盘，用于GlusterFS存储，大小为10G。

## 格式化并挂载分区

以下步骤需要在三台虚拟机上都执行一遍，为了方便操作，切换到root用户：

1. 为磁盘创建分区

    通过`vagrant ssh`命令进入到任意一个节点，执行`lsblk`命令应该能查看到类似以下输出：

    ```bash
    [root@gluster-node1 ~]# lsblk
    NAME            MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
    sda               8:0    0   40G  0 disk
    ├─sda1            8:1    0  500M  0 part /boot
    └─sda2            8:2    0 39.5G  0 part
      ├─centos-root 253:0    0 37.5G  0 lvm  /
      └─centos-swap 253:1    0    2G  0 lvm  [SWAP]
    sdb               8:16   0   10G  0 disk
    ```

    可以看到第二块磁盘sdb没有分区，我们应该先分区:

    ```bash
    [root@gluster-node1 ~]# parted /dev/sdb
    GNU Parted 3.1
    Using /dev/sdb
    Welcome to GNU Parted! Type 'help' to view a list of commands.
    (parted) mklabel gpt
    (parted) mkpart primary xfs 1M 100%
    (parted) quit
    Information: You may need to update /etc/fstab.
    ```

    这里使用`parted`命令进行操作，为sdb磁盘创建了gpt分区表，并将所有空间分给了xfs格式的主分区，执行完以上操作后再次执行`lsblk`命令应该能查看到类似以下输出：

    ```bash
    [root@gluster-node1 ~]# lsblk
    NAME            MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
    sda               8:0    0   40G  0 disk
    ├─sda1            8:1    0  500M  0 part /boot
    └─sda2            8:2    0 39.5G  0 part
      ├─centos-root 253:0    0 37.5G  0 lvm  /
      └─centos-swap 253:1    0    2G  0 lvm  [SWAP]
    sdb               8:16   0   10G  0 disk
    └─sdb1            8:17   0   10G  0 part
    ```

2. 格式化并挂载新建分区

    将分区格式化为xfs格式：

    ```bash
    [root@gluster-node1 ~]# mkfs.xfs -i size=512 /dev/sdb1
    meta-data=/dev/sdb1              isize=512    agcount=4, agsize=655232 blks
             =                       sectsz=512   attr=2, projid32bit=1
             =                       crc=0        finobt=0
    data     =                       bsize=4096   blocks=2620928, imaxpct=25
             =                       sunit=0      swidth=0 blks
    naming   =version 2              bsize=4096   ascii-ci=0 ftype=0
    log      =internal log           bsize=4096   blocks=2560, version=2
             =                       sectsz=512   sunit=0 blks, lazy-count=1
    realtime =none                   extsz=4096   blocks=0, rtextents=0
    ```
    
    创建挂载点：
    ```bash
    [root@gluster-node1 ~]# mkdir -p /data/brick1
    ```

    将挂载信息写入`/etc/fstab`以便重启虚拟机之后能够自动挂载：

    ```bash
    [root@gluster-node1 ~]# echo '/dev/sdb1 /data/brick1 xfs defaults 1 2' >> /etc/fstab
    ```

    挂载分区：

    ```bash
    [root@gluster-node1 ~]# mount /dev/sdb1 /data/brick1
    ```

## 安装并配置GlusterFS

以下操作需要再所有节点上执行：

1. 安装GlusterFS：

    ```bash
    [root@gluster-node1 ~]# yum install centos-release-gluster
    [root@gluster-node1 ~]# yum install glusterfs-server
    ```

2. 启动GlusterFS管理进程，并查看进程状态：

    ```bash
    [root@gluster-node1 ~]# systemctl enable glusterd
    [root@gluster-node1 ~]# systemctl start glusterd
    [root@gluster-node1 ~]# systemctl status glusterd
    ● glusterd.service - GlusterFS, a clustered file-system server
    Loaded: loaded (/usr/lib/systemd/system/glusterd.service; disabled; vendor preset: disabled)
    Active: active (running) since Tue 2018-01-09 11:40:59 UTC; 24s ago
    Process: 12252 ExecStart=/usr/sbin/glusterd -p /var/run/glusterd.pid --log-level $LOG_LEVEL $GLUSTERD_OPTIONS (code=exited, status=0/SUCCESS)
    Main PID: 12253 (glusterd)
    CGroup: /system.slice/glusterd.service
    └─12253 /usr/sbin/glusterd -p /var/run/glusterd.pid --log-level INFO

    Jan 09 11:40:59 gluster-node1 systemd[1]: Starting GlusterFS, a clustered file-system server...
    Jan 09 11:40:59 gluster-node1 systemd[1]: Started GlusterFS, a clustered file-system server.
    Jan 09 11:41:15 gluster-node1 systemd[1]: Started GlusterFS, a clustered file-system server.
    ``` 

3. 配置防火墙

    各个节点上的gluster进程需要能够互相交流，为了简化配置，在每个节点上设置防火墙来接收来自其他节点的路由：

    ```bash
    iptables -I INPUT -p all -s <ip-address> -j ACCEPT
    ```

    在实际操作中将命令中的<ip-address>替换为其他节点的ip地址。

4. 配置信任池
    
    ```bash
    gluster peer probe <server-address>
    ```

    这里的<server-address>可以是ip地址，也可以是hostname。当使用hostname时，需要先在/etc/hosts文件中配置好其他节点的ip地址和主机名。一旦信任池被建立，只有池中的成员可以添加新的服务器到信任池中。可以通过以下命令查看：

    ```bash
    gluster peer status
    ```

5. 设置GlusterFS卷

    在每个节点上创建以下目录：

    ```bash
    mkdir -p /data/brick1/gv0
    ```

    在任意节点执行以下命令来创建、启动卷：

    ```bash
    [root@gluster-node1 ~]# gluster volume create gv0 replica 3 gluster-node1:/data/brick1/gv0 gluster-node2:/data/brick1/gv0 gluster-node3:/data/brick1/gv0
volume create: gv0: success: please start the volume to access data
    [root@gluster-node1 ~]# gluster volume start gv0
    volume start: gv0: success
    ```

    上述创建卷的命令指定了卷的类型是"replica"，GlusterFS支持的卷有多种，其中有3种基础卷：

    * Distributed - 分布卷：将不同的文件存储在卷中的不同块，适用于存储可动态扩展的环境。
    * Replicated - 复制卷：将文件复制到卷中的不同块，适用于高可用高稳定的环境。
    * Striped - 条状卷：将大文件拆分，分开存储文件不同的部分在卷中的不同块，适用于处理大文件的情况。

    其他卷的类型可以是以上3种基础卷的不同组合，详情可以查看[官方文档](http://docs.gluster.org/en/latest/Administrator%20Guide/Setting%20Up%20Volumes/)。

    确定卷已启动：

    ```bash
    [root@gluster-node1 ~]# gluster volume info

    Volume Name: gv0
    Type: Replicate
    Volume ID: 620f5f40-3bec-4c32-8f72-2d64debc8ae4
    Status: Started
    Snapshot Count: 0
    Number of Bricks: 1 x 3 = 3
    Transport-type: tcp
    Bricks:
    Brick1: gluster-node1:/data/brick1/gv0
    Brick2: gluster-node2:/data/brick1/gv0
    Brick3: gluster-node3:/data/brick1/gv0
    Options Reconfigured:
    transport.address-family: inet
    nfs.disable: on
    performance.client-io-threads: off
    ```

    看到`Status: Started`字样，说明卷已经启动。

6. 测试GlusterFS卷

    在集群外的一台测试机上连接已经部署好的GlusterFS集群，需要先安装客户端软件：

    ```bash
    [root@prometheus ~]# yum install -y gulsterfs glusterfs-fuse
    ```

    并且将GlusterFS集群各个节点的ip和hostname信息写入/etc/hosts文件：

    ```bash
    [root@prometheus ~]# cat /etc/hosts
    127.0.0.1	prometheus	prometheus
    127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
    ::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
    192.168.12.101	gluster-node1
    192.168.12.102	gluster-node2
    192.168.12.103	gluster-node3
    ```

    挂载远程GlusterFS卷：

    ```bash
    [root@prometheus ~]# mount -t glusterfs gluster-node1:/gv0 /mnt
    ```

    也可以选择挂载其他节点的卷，效果都一样。在/mnt文件夹中创建一个测试文件test.txt：

    ```bash
    [root@prometheus mnt]# touch test.txt
    ```

    在GlusterFS集群的每个节点中，都应该能看到test.txt文件的存在：

    gluster-node1节点：

    ```bash
    [root@gluster-node1 ~]# ls /data/brick1/gv0/
    test.txt
    ```

    gluster-node2节点：

    ```bash
    [root@gluster-node2 ~]# ls /data/brick1/gv0/
    test.txt
    ```

    gluster-node3节点：

    ```bash
    [root@gluster-node3 ~]# ls /data/brick1/gv0/
    test.txt
    ```
