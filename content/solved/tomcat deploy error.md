+++
title = "Tomcat Deploy Error"
date = 2018-02-06T18:44:13+08:00
draft = false
tags = ["tomcat"]
categories = ["solved"]
+++

# tomcat 部署war包出错

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
