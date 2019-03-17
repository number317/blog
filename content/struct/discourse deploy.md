+++
title = "Discourse Deploy"
date = 2017-10-18T20:03:58+08:00
draft = false
tags = ["discourse"]
categories = ["struct"]
+++

# discourse docker 部署

## 部署说明

- 目标：以容器的方式部署discourse到网站的二级域名，如 `http://test.test.com/community/`
- 架构：1个postgres数据库，1个redis数据库，1个discourse服务器

<!--more-->

## 部署步骤

按照官方的建议，采用官方提供的脚本来构建镜像。

1. 克隆官方的工具库

```bash
git clone https://github.com/discourse/discourse_docker.git
```

2. 复制`templates`目录下的`postgres.template.yml`，`redis.template.yml`，`web.china.template.yml`文件到`containers`目录下，分别重命名为`postgresql.yml`，`redis.yml`，`discourse.yml`

3. 编辑`postgresql.yml`，完整内容如下：

```yaml
templates:
  - "templates/postgres.template.yml"
params:
  db_default_text_search_config: "pg_catalog.english"
  # 设置postgresql运行内存，可以根据需要设置大小
  db_work_mem: "2048MB"

expose:
  # 暴露端口 主机端口:容器端口
  - "5432:5432"

env:
  LANG: en_US.UTF-8

volumes:
  # 挂载数据卷
  - volume:
        host: /path/to/postgresql
        guest: /shared
  - volume:
        host: /path/to/postgresql/log/var-log
        guest: /var/log

hooks:
  after_postgres:
    - exec:
        stdin: |
          alter user discourse with password 'test';
        cmd: su - postgres -c 'psql discourse'

        raise_on_fail: false
```

4. 编辑`reids.yml`，内容如下：

```yaml
templates:
  - "templates/redis.template.yml"

expose:
  # 暴露端口
  - "6379:6379"


env:
  LANG: en_US.UTF-8

volumes:
  - volume:
        host: /path/to/redis
        guest: /shared
  - volume:
        host: /path/to/redis/log/var-log
        guest: /var/log
```

5. 编辑`discourse.yml`，内容如下：

```yaml
templates:
  - "templates/web.template.yml"
  - "templates/web.ratelimited.template.yml"

expose:
  - "10083:80"

# Use 'links' key to link containers together, aka use Docker --link flag.
links:
  - link:
      name: postgresql
      alias: postgresql
  - link:
      name: redis
      alias: redis

env:
  LANG: en_US.UTF-8

  DISCOURSE_DB_SOCKET: ''
  # postgres 数据库用户名
  DISCOURSE_DB_USERNAME: example
  # postgres 数据库密码
  DISCOURSE_DB_PASSWORD: example
  # postgres 数据库主机
  DISCOURSE_DB_HOST: postgresql
  # redis 数据库主机
  DISCOURSE_REDIS_HOST: redis

  # 设置开发者邮箱
  DISCOURSE_DEVELOPER_EMAILS: 'example@example.com'

  DISCOURSE_HOSTNAME: 'discourse.example.com'

  # 配置邮件服务器信息
  DISCOURSE_SMTP_ADDRESS: example.example.com
  DISCOURSE_SMTP_PORT: 25
  DISCOURSE_SMTP_USER_NAME: user.example.com
  DISCOURSE_SMTP_PASSWORD: password
  DISCOURSE_SMTP_AUTHENTICATION: login

  # 启用discourse跨域请求
  DISCOURSE_ENABLE_CORS: true
  DISCOURSE_CORS_ORIGIN: '*'
  # 设置discourse相对路径
  DISCOURSE_RELATIVE_URL_ROOT: /community

volumes:
  - volume:
      host: /path/to/web-only
      guest: /shared
  - volume:
      host: /path/to/web-only/log/var-log
      guest: /var/log
  - volume:
      host: /path/to/web-only/asserts
      guest: /var/www/discourse/public/assets

hooks:
  after_code:
    - exec:
        cd: $home/plugins
        cmd:
          - git clone https://github.com/discourse/docker_manager.git
          # 安装cas登录插件，安装好后需要后续的配置
          - git clone https://github.com/tyl3k/cas_sso.git
          - git clone https://github.com/discourse/discourse-solved.git
          # 安装sitemap插件
          - git clone https://github.com/discoursehosting/discourse-sitemap.git

run:
  - exec: echo "Beginning of custom commands"
  # 为资源创建软链接，保证二级url的discourse能找到资源 
  - exec: mkdir /var/www/discourse/public/community
  - exec: ln -s /var/www/discourse/public/assets /var/www/discourse/public/community/assets
  - exec: ln -s /var/www/discourse/public/backups /var/www/discourse/public/community/backups
  - exec: ln -s /var/www/discourse/public/images /var/www/discourse/public/community/images
  - exec: ln -s /var/www/discourse/public/javascripts /var/www/discourse/public/community/javascripts
  - exec: ln -s /var/www/discourse/public/plugins /var/www/discourse/public/community/plugins
  - exec: ln -s /var/www/discourse/public/service-worker.js /var/www/discourse/public/community/service-worker.js
  - exec: ln -s /var/www/discourse/public/uploads /var/www/discourse/public/community/uploads
  # 修改digest邮件模板退订链接
  - exec: sed -i "s/host: Discourse.base_url_no_prefix/host: Discourse.base_url/" /var/www/discourse/app/views/user_notifications/digest.html.erb
  - exec: echo "End of custom commands"
  - exec: awk -F\# '{print $1;}' ~/.ssh/authorized_keys | awk 'BEGIN { print "Authorized SSH keys for this container:"; } NF>=2 {print $NF;}'
```

6. 依次启动容器：
    
   ```bash
   ./launcher start redis
   ./launcher start postgresql
   ./launcher start discourse
   ```

7. 创建管理员帐号：

    1. 进入discourse容器：
    
       ```bash
       ./launcher enter discousre
       ```

    2. 创建管理员帐号：

       ```bash
       rake admin:create
       ```

       按照提示输入邮箱和密码，即可创建拥有管理员权限的帐号

       ![管理员帐号创建](/struct/images/discourse_deploy_img1.png)
    
8. 在浏览器中输入服务器ip地址加80端口即可访问discourse，可用创建好的帐号登录。
