+++
title = "Archlinux Nvidia"
date = 2019-09-29T14:07:53+08:00
draft = false
tags = ["system"]
categories = ["system"]
+++

# ArchLinux 配置 nvidia 独立显卡

按照 [PRIME Render Offload](https://download.nvidia.com/XFree86/Linux-x86_64/435.21/README/primerenderoffload.html) 文档，安装新版本的 nvidia 驱动和 xorg，新版本的 xorg 安装包可以从 [arch-xorg-server](https://gitlab.freedesktop.org/aplattner/arch-xorg-server) 构建。
修改配置文件 `/etc/X11/xorg.conf` ，主要添加

    Section "ServerLayout"
      Identifier "layout"
      Option "AllowNVIDIAGPUScreens"
    EndSection

完整配置如下:

<details>
<summary>xorg.conf</summary>

    Section "ServerLayout"
            Identifier     "X.org Configured"
            Screen      0  "Screen0" 0 0
            #Screen      1  "Screen1" RightOf "Screen0"
            InputDevice    "Mouse0" "CorePointer"
            InputDevice    "Keyboard0" "CoreKeyboard"
            Option         "AllowNVIDIAGPUScreens"
    EndSection
    
    Section "Files"
            ModulePath   "/usr/lib/xorg/modules"
            ModulePath   "/usr/lib/modules/extramodules-ARCH"
            FontPath     "/usr/share/fonts/TTF"
            FontPath     "/usr/share/fonts/adobe-source-code-pro"
    EndSection
    
    Section "Module"
            Load  "glx"
            Load  "nvidia-drm"
    EndSection
    
    Section "InputDevice"
            Identifier  "Keyboard0"
            Driver      "kbd"
    EndSection
    
    Section "InputDevice"
            Identifier  "Mouse0"
            Driver      "mouse"
            Option	    "Protocol" "auto"
            Option	    "Device" "/dev/input/mice"
            Option	    "ZAxisMapping" "4 5 6 7"
    EndSection
    
    Section "Monitor"
            Identifier   "Monitor0"
            VendorName   "Monitor Vendor"
            ModelName    "Monitor Model"
    EndSection
    
    Section "Device"
            ### Available Driver options are:-
            ### Values: <i>: integer, <f>: float, <bool>: "True"/"False",
            ### <string>: "String", <freq>: "<f> Hz/kHz/MHz",
            ### <percent>: "<f>%"
            ### [arg]: arg optional
            #Option     "SWcursor"           	# [<bool>]
            #Option     "kmsdev"             	# <str>
            #Option     "ShadowFB"           	# [<bool>]
            #Option     "AccelMethod"        	# <str>
            #Option     "PageFlip"           	# [<bool>]
            #Option     "ZaphodHeads"        	# <str>
            #Option     "DoubleShadow"       	# [<bool>]
            Option      "RenderAccel"               "1"
            Option      "DPMS"                      "1"
            Option      "RegistryDwords"            "EnableBrightnessControl=1"
            Identifier  "Card0"
            Driver      "modesetting"
            BusID       "PCI:0:2:0"
    EndSection
    
    Section "Device"
            Identifier  "Card1"
            Driver      "nvidia"
            BusID       "PCI:1:0:0"
            Option      "RenderAccel"               "1"
            Option      "DPMS"                      "1"
            Option      "RegistryDwords"            "EnableBrightnessControl=1"
            Option      "RegistryDwords"            "PowerMizerLevelAC=0x3"
            Option      "RegistryDwords"            "PowerMizerLevel=0x2"
            Option      "RegistryDwords"            "PerfLevelSrc=0x3333"
            Option      "OnDemandVBlankInterrupts"  "1"
    EndSection
    
    Section "Screen"
            Identifier "Screen0"
            Device     "Card0"
            Monitor    "Monitor0"
            SubSection "Display"
                    Viewport   0 0
                    Depth     1
            EndSubSection
            SubSection "Display"
                    Viewport   0 0
                    Depth     4
            EndSubSection
            SubSection "Display"
                    Viewport   0 0
                    Depth     8
            EndSubSection
            SubSection "Display"
                    Viewport   0 0
                    Depth     15
            EndSubSection
            SubSection "Display"
                    Viewport   0 0
                    Depth     16
            EndSubSection
            SubSection "Display"
                    Viewport   0 0
                    Depth     24
            EndSubSection
    EndSection

</details>

安装好软件后需要重启电脑，开启桌面后执行 `xrandr --listproviders` ，应该可以看到如下结果:

    Providers: number : 2
    Provider 0: id: 0x1e0 cap: 0xf, Source Output, Sink Output, Source Offload, Sink Offload crtcs: 3 outputs: 5 associated providers: 0 name:modesetting
    Provider 1: id: 0x1b8 cap: 0x0 crtcs: 0 outputs: 0 associated providers: 0 name:NVIDIA-G0

如果只看到一条记录，那可能是 `nvidia-drm` 模块没有加载，需要手动加载一下:

    modprobe nvidia-drm

重启 xorg 服务后应该看到两个 provider，执行 `nvidia-smi` 应该有如下结果

    +-----------------------------------------------------------------------------+
    | NVIDIA-SMI 435.21       Driver Version: 435.21       CUDA Version: 10.1     |
    |-------------------------------+----------------------+----------------------+
    | GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
    | Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
    |===============================+======================+======================|
    |   0  GeForce GTX 1050    Off  | 00000000:01:00.0 Off |                  N/A |
    | N/A   34C    P8    N/A /  N/A |     36MiB /  4042MiB |      0%      Default |
    +-------------------------------+----------------------+----------------------+
    
    +-----------------------------------------------------------------------------+
    | Processes:                                                       GPU Memory |
    |  GPU       PID   Type   Process name                             Usage      |
    |=============================================================================|
    |    0      1243      G   /usr/lib/Xorg                                 36MiB |
    +-----------------------------------------------------------------------------+


<a id="orgd2bf049"></a>

# firefox webgl 配置独立显卡

默认情况下应用都使用集成显卡来运行，如果需要使用独立显卡，需要添加环境变量:

    __NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia firefox

在 firefox 打开 `about:support` 页面，在 `Graphics` 下查看 `WebGL 1 Driver Renderer` ，如果发现如下报错:

    WebGL creation failed: 
    Refused to create native OpenGL context because of blacklist entry: FEATURE<sub>FAILURE</sub><sub>GLXTEST</sub><sub>FAILED</sub>
    Exhausted GL driver options.

那可以打开 firefox 的 `about:config` 页面，修改 `webgl.force-enable` 为 `true` ，重启 firefox，应该就能看到 `WebGL 1 Driver Renderer` 显示的是独立显卡了。
打开 [fishgl](http://www.fishgl.com/) 可以测试 webgl。同时再执行 `nvidia-smi` 的话可以看到有 firefox 的进程。

