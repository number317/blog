+++
title = "React Native Android"
date = 2020-07-03T16:40:03+08:00
draft = false
tags = ["react-native", "android"]
categories = ["categories"]
+++

# React Native Android 相关记录

## 在同一设备中安装多个相同应用

为了避免冲突，需要修改 app 的 ID。修改 `app/build.gradle` 中 `defaultConfig` 里的:

```
applicationId "com.testapp.com"
```

还要修改 provider。修改 `app/src/main/AndroidManifest.xml` 中的:

```
android:authorities="com.testapp.com.provider"
```

为了便于区分，可以修改 app 的名字。修改 `app/src/main/res/values/strings.xml` 中的:

```
<string name="app_name">测试 app</string>
```

