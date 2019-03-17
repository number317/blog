+++
title = "Discourse Digest"
date = 2017-10-24T19:27:59+08:00
draft = false
tags = ["discourse"]
categories = ["struct"]
+++

# 问题说明

- discourse 版本：v1.9.0.beta12 +49
- discourse 域名: http://test.test.com/community
- 详细情况：discourse 配置好二级域名后，摘要邮件中取消订阅链接错误

<!--more-->

# 解决方法

1. 进入到服务器中discourse的部署目录，运行`./launcher enter discourse`进入到容器中
2. 进入到`/var/www/discourse/app/views/user_notifications`目录，该目录下有两个文件

    - `digest.html.erb`
    - `digest.text.erb`

    分别代表html格式的邮件和text格式的邮件

3. 编辑`digest.html.erb`文件，找到如下内容:

    ```ruby
    <div dir="<%= rtl? ? 'rtl' : 'ltr' %>" class='footer'>
    <%=raw(t 'user_notifications.digest.unsubscribe',
            site_link: html_site_link(@anchor_color),
            email_settings_url: Discourse.base_url + '/my/preferences/emails',
            unsubscribe_link: link_to(t('user_notifications.digest.click_here'), email_unsubscribe_url(host: Discourse.base_url_no_prefix, key: @unsubscribe_key), {:style=>"color: ##{@anchor_color}"}))  %>
    </div>
    ```

    该部分内容定义了html格式邮件的footer，三个url分别代表站点地址，邮件设置地址，取消订阅地址。需要修改的地方是将`email_unsubscribe_url`中的`host`部分的`Discourse.base_url_no_prefix`替换为`Discourse.base_url`

    整段内容替换好后如下:

    ```ruby
    <div dir="<%= rtl? ? 'rtl' : 'ltr' %>" class='footer'>
    <%=raw(t 'user_notifications.digest.unsubscribe',
            site_link: html_site_link(@anchor_color),
            email_settings_url: Discourse.base_url + '/my/preferences/emails',
            unsubscribe_link: link_to(t('user_notifications.digest.click_here'), email_unsubscribe_url(host: Discourse.base_url, key: @unsubscribe_key), {:style=>"color: ##{@anchor_color}"}))  %>
    </div>
    ```
4. 退出discourse容器，重启容器即可
