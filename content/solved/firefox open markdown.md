+++
title = "Openshift Restart Node"
date = 2018-04-17T01:17:33+08:00
draft = false
tags = ["firefox"]
categories = ["solved"]
+++

# 使用firefox打开并渲染markdown

如果用firefox打开markdown文件只有下载选项，需要更新mime的数据库:

在`~/.local/share/mime/packages`目录下创建`text-markdown.xml`文件，内容如下

```
<?xml version="1.0"?>
<mime-info xmlns='http://www.freedesktop.org/standards/shared-mime-info'>
  <mime-type type="text/plain">
    <glob pattern="*.md"/>
    <glob pattern="*.mkd"/>
    <glob pattern="*.markdown"/>
  </mime-type>
</mime-info>
```

然后执行`update-mime-database ~/.local/share/mime`

完成后即可用firefox打开markdown文件。若想要查看markdown的渲染效果，可以安装markdown的插件，如markdown viewer webext等
