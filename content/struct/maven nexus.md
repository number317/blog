+++
title = "Maven & Nexus"
date = 2017-11-09T10:47:30+08:00
draft = false
tags = ["maven", "nexus"]
categories = ["struct"]
+++

# maven 配置使用 nexus 私服

修改~/.m2/settings.xml内容如下：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 http://maven.apache.org/xsd/settings-1.0.0.xsd">
    <servers>
        <server>
            <id>releases</id>
            <username>admin</username>
            <password>admin123</password>
        </server>
        <server>
            <id>snapshots</id>
            <username>admin</username>
            <password>admin123</password>
        </server>
        <server>
            <id>thirdpart</id>
            <username>admin</username>
            <password>admin123</password>
        </server>
    </servers>

    <mirrors>
        <mirror>
            <id>central</id>
            <name>central</name>
            <url>http://localhost:8081/nexus/content/groups/public/</url>
            <mirrorOf>*</mirrorOf>
        </mirror>
    </mirrors>

</settings>
```

在项目的pom.xml文件中添加如下内容：

```xml
<distributionManagement>
    <snapshotRepository>
        <id>snapshots</id>
        <name>Snapshot Repository</name>
        <url>http://localhost:8081/nexus/content/repositories/snapshots/</url>
    </snapshotRepository>
    <repository>
        <id>releases</id>
        <name>Release Repository</name>
        <url>http://localhost:8081/nexus/content/repositories/releases/</url>
    </repository>
</distributionManagement>

<repositories>
    <repository>
        <id>public</id>
        <name>Public</name>
        <url>http://localhost:8081/nexus/content/groups/public</url>
        <releases>
            <enabled>true</enabled>
        </releases>
        <snapshots>
            <enabled>true</enabled>
        </snapshots>
    </repository>
    <repository>
        <id>snapshots</id>
        <name>Snapshots</name>
        <url>http://localhost:8081/nexus/content/repositories/snapshots</url>
        <releases>
            <enabled>true</enabled>
        </releases>
        <snapshots>
            <enabled>true</enabled>
        </snapshots>
    </repository>
    <repository>
        <id>thirdparty</id>
        <name>3rd party</name>
        <url>http://localhost:8081/nexus/content/repositories/thirdparty/</url>
        <releases>
            <enabled>true</enabled>
        </releases>
        <snapshots>
            <enabled>true</enabled>
        </snapshots>
    </repository>
</repositories>
<pluginRepositories>
    <pluginRepository>
        <id>public</id>
        <name>Plugin Repository</name>
        <url>http://localhost:8081/nexus/content/groups/public</url>
        <layout>default</layout>
        <snapshots>
            <enabled>true</enabled>
        </snapshots>
    </pluginRepository>
</pluginRepositories>
```

# 向 nexus 中部署 snapshot 版本的包

1. 如果是在项目中(已配置好私服环境)，可以直接运行`mvn deploy`来将文件上传到nexus私服中
2. 如果只有单独的jar包或war包，可以运行以下命令部署：

    ```bash
    mvn deploy:deploy-file \
        -DgroupId=test \
        -DartifactId=test \
        -Dversion=1.0-SNAPSHOT \
        -Dpackaging=jar \
        -Dfile=test-1.0-SNAPSHOT.jar \
        -Durl=http://localhost:8081/nexus/content/repositories/snapshots/ \
        -DrepositoryId=snapshots \
        -s ~/.m2/settings.xml
    ```

    `-Dfile`指定文件的路径，`-s`指定maven运行的配置文件
