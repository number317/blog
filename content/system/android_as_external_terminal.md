+++
title = "Android As External Terminal"
date = 2024-12-20T10:41:51+08:00
draft = false
tags = ["android"]
categories = ["system"]
summary = "Make your android device as an external terminal."
+++

Android As External Terminal

我有一个 Eink 安卓平板，型号是 Moaan InkpadX。它配备了 10 英寸的 Eink 屏幕，分辨率为 1600x1200，像素密度为 200 ppi。

默认情况下，它不支持作为额外的显示器，但我找到了一种工作流程，使其可以作为一个外部终端。（只能作为一个终端，不能显示其他图形界面应用程序。）

# 前提条件

- 安卓端
  - Android 版本 >= 6.0
  - 安装了 Termux 应用
- 电脑端
  - herbstluftwm 窗口管理器
  - scrcpy
  - ssh

# 操作步骤

首先，你应该将你的安卓设备连接到计算机。然后你的计算机可以通过 `adb devices -l` 找到设备。

现在你可以通过 `scrcpy --keyboard uhid` 用 `scrcpy` 连接安卓，并把窗口移动到一个空的标签页。例如，标签 9。

使用 `herbstclient add_monitor 1600x1200+3840+0` 在 herbstluftwm 中创建一个虚拟显示器。

切换到新的虚拟显示器并聚焦标签9，以便在切换显示器时自动聚焦 scrcpy 窗口。

现在你可以在安卓设备上打开 Termux 应用，并通过 `ssh` 连接到你的计算机。它就变成了你的 herbstluftwm 的外部终端。你可以通过 herbstulfwm 配置的快捷键来在安卓和计算机之间循环聚焦，并且它们共享同一个键盘。

# 遇到的问题

- 输入法

  Moaan InkpadX 自带的输入法是搜狗输入法，在 `Termux` 中，如果中文输入不生效，需要在 `Termux` 从左侧边缘向右滑动，出现侧边栏，点击 `Keyboard`，这时就可以输入中文了。可以通过 `Shift` 来切换中英文。但是搜狗输入法在英文状态下 Shift 会被强制认定为切换中英文，导致无法输入符号。最后我通过安装 [trime](https://github.com/osfans/trime "trime") 输入法解决了这个问题。
