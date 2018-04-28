+++
title = "Tcp Ip"
date = 2018-04-26T15:37:41+08:00
draft = false
tags = ["network"]
categories = ["system"]
+++

# TCP/IP 基础

## ISO/OSI参考模型

OSI(Open System Interconnection) 开放系统互联模型是由ISO(International Organization for Standardization)国际标准化组织定义的网络分层模型，共7层。由上到下依次为：
    
* 应用层：提供应用程序间通信，传输单位APDU
* 表示层：处理数据格式，数据加密等，传输单位PPDU
* 会话层：建立、维护和管理会话，传输单位SPDU
* 传输层：建立端到端连接，传输单位是segment
* 网络层：寻址和路由选择，传输单位是packet
* 数据链路层：介质访问，链路管理，传输单位是frame
* 物理层：比特流传输，传输单位是bit

各层的传输单位统称为PDU(Protocol Data Unit)，协议数据单元

### 物理层(Physical Layer)

物理层定义了所有电子及物理设备的规范，为上层的传输提供了一个物理介质，本层中数据传输的单位是比特(bit)。属于本层定义的规范有EIA/TIA RS-232、EIA/TIA RS-449、V.35、RJ-45（俗称水晶头）等，实际使用中的设备如网卡等属于本层。

### 数据链路层(Data Link Layer)

数据链路层对物理层收到的比特流进行数据成帧。提供可靠的数据传输服务，实现无差错数据传输。在数据链路层中数据的单位是帧(frame)。属于本层定义的规范有SDLC、HDLC、PPP、STP、帧中继等，实际使用中的设备如switch交换机属于本层。

### 网络层(Network Layer)

网络层负责将各个子网之间的数据进行路由选择，分组与重组。本层中数据传输的单位是数据包(packet)。属于本层定义的规范有IP、IPX、RIP、OSPF、ICMP、IGMP等。实际使用中的设备如路由器属于本层。

### 传输层(Transport Layer)

传输层提供可靠的数据传输服务，它检测路由器丢弃的包，然后产生一个重传请求，能够将乱序收到的数据包重新排序。
