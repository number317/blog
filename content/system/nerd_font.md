+++
title = "Nerd Font"
date = 2019-06-21T14:32:35+08:00
draft = false
tags = ["font", "icons"]
categories = ["system"]
+++

# 图标字体

在用 [dzen2](https://github.com/robm/dzen) 给桌面添加一个 panel 的时候用到了 [FontAwesome](http://fontawesome.com)，但是在 urxvt 终端下 FontAwesome 无法正常显示出来（不知是不是配置有误）。这样在用 vim 写脚本时不够直观。又不想换终端，所以只能从字体下手。

之前就了解到过 [nerd-fonts](https://github.com/ryanoasis/nerd-fonts) 这个项目，可以将图标字体整合进一个你想要的字体中。项目主页提供了一些已经预先构建好的字体，可以在[官网](https://nerdfonts.com/)直接下载使用。目前终端用的字体是从另一台 Mac 上复制出来的 SFMono，这也是 Mac 内置终端默认的字体。已经习惯了这款字体后就不想换了，因此准备构建自己的字体。

根据项目主页的教程，执行它提供给你的 `font-patcher` 脚本前需要安装 `fontforge`:

```bash
pacman -S fontforge
```

安装完依赖，下载 `font-patcher` 脚本并添加可执行权限:

```bash
curl -OL https://raw.githubusercontent.com/ryanoasis/nerd-fonts/master/font-patcher
chmod +x font-patcher
```

执行脚本进行构建字体:

```bashs
./font-patcher path/to/SFMono-Regular.otf -out path/to/SFMono-Nerd/ -c -l -s
```

* `-c` 表示添加所有可用字形
* `-l` 表示适应行高（尝试将 powerline 的分隔符均匀地放在中间）
* `-s` 表示使用单个字符宽度

运行脚本发现报错，提示找不到 `src` 目录下的字体文件。这提示我们还需要去下载 `src` 目录下的字体文件。这里有一个技巧，关于如何从 github 下载某个文件夹。

以此处为例，需要下载[https://github.com/ryanoasis/nerd-fonts/tree/master/src/glyphs](https://github.com/ryanoasis/nerd-fonts/tree/master/src/glyphs)目录下的所有字体文件。可以将 url 中的 "tree/master" 替换为 ”trunk“，再用 svn 去下载就好了。

所以这里执行 `svn checkout https://github.com/ryanoasis/nerd-fonts/trunk/src/glyphs`，并将文件夹发到正确的路径，具体如下:

```
├── font-patcher
├── SF-Mono
├── SF-Mono-Nerd
└── src/
    └── glyphs
        ├── devicons.ttf
        ├── font-awesome-extension.ttf
        ├── FontAwesome.otf
        ├── font-logos.ttf
        ├── materialdesignicons-webfont.ttf
        ├── NerdFontsSymbols 1000 EM Nerd Font Complete Blank.sfd
        ├── NerdFontsSymbols 2048 EM Nerd Font Complete Blank.sfd
        ├── octicons.ttf
        ├── original-source.otf
        ├── Pomicons.otf
        ├── PowerlineExtraSymbols.otf
        ├── PowerlineSymbols.otf
        ├── Symbols-1000-em Nerd Font Complete.ttf
        ├── Symbols-2048-em Nerd Font Complete.ttf
        ├── Symbols Template 1000 em.ttf
        ├── Symbols Template 2048 em.ttf
        ├── Unicode_IEC_symbol_font.otf
        └── weathericons-regular-webfont.ttf
```

接下来就可以再次执行命令了，等待字体构建完毕，将生成的字体放到 `/usr/share/fonts/SF-Mono` 目录下，执行 `fc-list|grep SF`，应该能看到刚刚生成的文字了。

接下来配置 urxvt，设置字体:

```
! vi: set ft=xdefaults :

!!font
URxvt.font: xft:SF Mono:antialias=True:style=Regular:size=16:hinting=true,\
            xft:.PingFang SC:antialias=True:style=Regular:size=16:hinting=true

URxvt.boldFont: xft:SF Mono:antialias=True:style=Bold:size=16:hinting=true,\
                xft:.PingFang SC:antialias=True:style=Bold:size=16:hinting=true

URxvt.italicFont: xft:SF Mono:antialias=True:style=Regular Italic:size=16:hinting=true,\
                  xft:.PingFang SC:antialias=True:style=Light:size=16:hinting=true

URxvt.boldItalicFont: xft:SF Mono:antialias=True:style=Bold Italic Italic:size=16:hinting=true,\
                      xft:.PingFang SC:antialias=True:style=Medium:size=16:hinting=true

URxvt.letterSpace: -2
```

重新加载 urxvt 配置:

```bash
xrdb -remove && xrdb -load ~/.Xresources
```

重新打开 urxvt 并打开带有图标的文本，成功的话应该能看到图标显示出来了。

![icon text](/system/images/nerd_font_img1.jpg)

有了 nerd fonts，不仅仅是可以在文本里显示图标，还可以美化一些软件，比如 vim，ranger。

## vimdevicons 配置

[devicons](https://github.com/ryanoasis/vim-devicons) 可以为一些插件根据文件类型添加图标，以 [nerdtree](https://github.com/scrooloose/nerdtree.git) 为例:

1. 安装 nerdtree 和 devicons。在 Plug 配置中添加

   ```
   Plug 'scrooloose/nerdtree'
   Plug 'ryanoasis/vim-devicons'
   ```

     执行 `PlugInstall` 即可完成安装。

2. 设置 vim 默认编码为 utf-8:

   ```
   set encoding=UTF-8
   ```

这样就已经配置完毕了，打开 nerdtree 应该能看见不同文件的图标。

![vimdevicons](/system/images/nerd_font_img2.jpg)

## ranger 配置

下载插件脚本:

```bash
curl -L -o ~/.config/ranger/devicons.py "https://gist.github.com/alexanderjeurissen/73053bb0a8b02f5d7f1674294c5fec3c/raw/bf6aca081081b6b6b2b1531f1ed6a040c10a4d2c/devicons.py"
curl -L -o ~/.config/ranger/plugins/devicons_linemode.py "https://gist.githubusercontent.com/alexanderjeurissen/73053bb0a8b02f5d7f1674294c5fec3c/raw/bf6aca081081b6b6b2b1531f1ed6a040c10a4d2c/devicons_linemode.py"
```

在 `rc.conf` 中加入配置:

```
default_linemode devicons
```

重新打开 ranger，应该可以看到图标了。

![ranger](/system/images/nerd_font_img3.jpg)
