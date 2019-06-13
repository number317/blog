+++
title = "Tomcat Deploy Error"
date = 2018-02-06T18:44:13+08:00
draft = false
tags = ["tomcat"]
categories = ["solved"]
+++

# tomcat部署war包出错

## 错误1

错误日志如下：

```log
Caused by: java.lang.IllegalStateException: Unable to complete the scan for annotations for web application [/capitalplan] due to a StackOverflowError. Possible root causes include a too low setting for -Xss and illegal cyclic inheritance dependencies. The class hierarchy being processed was [org.bouncycastle.asn1.ASN1EncodableVector->org.bouncycastle.asn1.DEREncodableVector->org.bouncycastle.asn1.ASN1EncodableVector]
	at org.apache.catalina.startup.ContextConfig.checkHandlesTypes(ContextConfig.java:2099)
	at org.apache.catalina.startup.ContextConfig.processAnnotationsStream(ContextConfig.java:2043)
	at org.apache.catalina.startup.ContextConfig.processAnnotationsJar(ContextConfig.java:1989)
	at org.apache.catalina.startup.ContextConfig.processAnnotationsUrl(ContextConfig.java:1959)
	at org.apache.catalina.startup.ContextConfig.processAnnotations(ContextConfig.java:1912)
	at org.apache.catalina.startup.ContextConfig.webConfig(ContextConfig.java:1154)
	at org.apache.catalina.startup.ContextConfig.configureStart(ContextConfig.java:771)
	at org.apache.catalina.startup.ContextConfig.lifecycleEvent(ContextConfig.java:298)
	at org.apache.catalina.util.LifecycleBase.fireLifecycleEvent(LifecycleBase.java:94)
	at org.apache.catalina.core.StandardContext.startInternal(StandardContext.java:5093)
	at org.apache.catalina.util.LifecycleBase.start(LifecycleBase.java:152)
	... 10 more
```

解决方案：

修改conf/catalina.properties:

```conf
tomcat.util.scan.DefaultJarScanner.jarsToSkip=\,*
```

设置不扫描jar包

## 错误2

在运行日志里查看不到错误，可以在logs目录下查看localhost.xxx文件，发现报错如下：

```log
java.lang.NoSuchMethodError: org.springframework.aop.framework.AopProxyUtils.getSingletonTarget(Ljava/lang/Object;)Ljava/lang/Object;
```

这种错误通常由jar包冲突导致，可以在项目里执行`mvn dependency:tree`查看项目的依赖情况，在上述的日志中，发现是`springframework.aop`这个出错，直接查找`aop`关键字，查看依赖后发现有两个jar包依赖于`spring-aop`，分别是`spring-context.jar:4.3.11.RELEASE`依赖于`spring-aop.jar:4.3.11.RELEASE`;`spring-jms.jar:4.3.6.RELEASE`依赖于`spring-aop.jar:4.3.6.RELEASE`，可以明显的看到4.3.6和4.3.11版本冲突了，这里将4.3.6版本修改为4.3.11版本后部署成功。
