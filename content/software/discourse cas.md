+++
title = "Discourse Cas"
date = 2017-10-23T09:15:44+08:00
draft = false
tags = ["discourse"]
categories = ["software"]
+++

# discourse cas 登录配置

## 插件安装

cas插件使用[tyl3k/cas_sso](https://github.com/tyl3k/cas_sso.git)，在`discourse.yml`中添加`git clone https://github.com/tyl3k/cas_sso.git`:

<!--more-->

```
hooks:
  after_code:
    - exec:
        cd: $home/plugins
        cmd:
          - git clone https://github.com/discourse/docker_manager.git
          - git clone https://github.com/tyl3k/cas_sso.git
          - git clone https://github.com/discourse/discourse-solved.git
          - git clone https://github.com/discoursehosting/discourse-sitemap.git
```

修改好配置文件后重新构建discourse镜像:

```
./launcher rebuild discourse
```

镜像构建完毕以上命令会自动启动discourse

## 插件配置

以管理员帐号进入discourse设置界面:

![进入设置界面](./hand/images/discourse_cas_img1.png)


![cas设置](./hand/images/discourse_cas_img2.png)

- cas sso url: https://login.hand-china.com/sso
- cas sso host: login.hand-china.com
- cas sso service validate url: /p3/serviceValidate
- cas sso email domain: hand-china.com
- cas sso user auto create: 不勾选
- cas sso user approved: 不勾选

退出登录后，点击登录，可以看到有cas登录选项的按钮：

![cas登录](./hand/images/discourse_cas_img3.png)

