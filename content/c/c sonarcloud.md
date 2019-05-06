+++
title = "C Sonarcloud"
date = 2019-05-06T06:55:56Z
draft = false
tags = ["c", "sonarqub"]
categories = ["c"]
+++

# C 配置 Sonarcloud

SonarQube 用于代码质量分析，可以检测出代码的 bug，代码异味，测试覆盖率等，有助于提高代码质量。SonarCloud 是 SonarQube 的在线使用版本，可以集成 github，travisCI。具体操作可以看[官方文档](https://sonarcloud.io/documentation)。

之前写了一个终端管理 ssh 登录的小工具，想着检测一下代码质量，就想到用这个工具来检测一下。由于不需要每次提交都进行质量检测，所以没有集成到 CI 里面，而是在服务器上利用 SonarQube Scanner 手动执行。从[检测结果](https://sonarcloud.io/dashboard?id=number317_ssh-tool)来看，代码中确实有一些 bug 和代码异味。

## 安装 build wrapper

在[下载页](https://sonarcloud.io/static/cpp/build-wrapper-linux-x86.zip)下载 linux 版的 build wrapper，解压出来应该有两个可执行文件。

```
build-wrapper-linux-x86/
├── build-wrapper-linux-x86-32
├── build-wrapper-linux-x86-64
├── libinterceptor-i686.so
└── libinterceptor-x86_64.so
```

可以将该目录加进`PATH`变量，方便调用。

## 安装 SonarQube Scanner

在[下载页](https://docs.sonarqube.org/display/SCAN/Analyzing+with+SonarQube+Scanner)找到对应的平台，下载压缩包。解压后得到如下目录：

```
sonar-scanner-3.3.0.1492-linux
├── bin
├── conf
├── jre
└── lib
```

可以将上面的`bin`目录添加到`PATH`环境变量中。

## 构建并分析代码

在项目的根目录下执行命令：

```bash
build-wrapper-linux-x86-64 --out-dir bw-output make
export JAVA_TOOL_OPTIONS="-Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=443 -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=443"
sonar-scanner \
  -Dsonar.projectKey=number317_ssh-tool \
  -Dsonar.organization=number317-github \
  -Dsonar.sources=. \
  -Dsonar.cfamily.gcov.reportsPath=. \
  -Dsonar.cfamily.build-wrapper-output=bw-output \
  -Dsonar.host.url=https://sonarcloud.io \
  -Dsonar.login=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

* `JAVA_TOOL_OPTIONS`里面配置了代理服务器。
* `-Dsonar.cfamily.gcov.reportsPath`配置了 gcov 测试结果的路径，用于覆盖率测试。覆盖率测试不达到 80%，代码质量检测无法通过。
* `-Dsonar.login`需要配置 Token，可以在 account → security 生成
