+++
title = "React Native Launcher"
summary = "为 kindle 上的 android 4.4 开发一个自定义启动器"
date = 2023-04-27T11:02:10+08:00
draft = false
tags = ["react-native", "android", "kindle", "eink"]
categories = ["frontend"]
+++

# React Native Launcher

多年前买的 Kindle Paperwhite3 刷了 android4.4 的系统，没有找到专门为阅读器适配的启动器，身为程序员，那就自己开发一个。

## 启动器需求

-   阅读相关
    -   能展示指定目录的书籍
    -   书籍可以展示自定义的封面
    -   可以展示目录
    -   可以支持 txt, epub, pdf 格式的书籍
    -   txt 可以自动拆分章节

-   应用相关
    -   可以展示系统安装的应用
    -   可以隐藏指定应用

## 技术选型

涉及到复杂计算，如处理 txt 章节，计算渲染文本，存储书籍数据之类的都用 android 原生来实现；
涉及到 UI 绘制的部分，都采用 react-native 来实现。这样可以兼顾开发效率和运行效率。

习惯了前端热加载，之前有在原生 android 应用里调试样式，感觉实在是太麻烦了。

## 框架搭建

react-native 最新版本已经不支持 android4.4 了，查看了[历史版本](https://www.npmjs.com/package/react-native/v/0.63.5)，发现 0.63.5 支持 android4.1：

    npx react-native init BookLauncher --version 0.63.5

项目初始化完成后，启动项目：

    cd BookLauncher
    npm run start

将 kindle 通过 usb 连接上电脑，确保 `adb devices -l` 可以看到设备后，另开终端运行 android 端应用：

    npm run android

在 kindle 真机上启动后会发现如下报错：
![img](/frontend/images/react_native_launcher_1.png)

在启动日志里也能看到报错：
![img](/frontend/images/react_native_launcher_2.png)

从红框标出的错误中可以明确看到是 `adb reverse` 命令执行失败了，导致在 kindle 上访问不到 `js server localhost:8081` 。

实际上这是 kindle 访问不到电脑上的 `js server` 导致的报错。正常情况下 `adb reverse tcp:8081 tcp:8081` 正常运行后会将 kindle 主机上的 `localhost:8081` 代理到电脑上的 `localhost:8081` 从而能正常访问 `js server` 。

点击 `RELOAD` 按钮可以看到一些解决提示：
![img](/frontend/images/react_native_launcher_3.png)

由于 android4.4 不支持 `adb reverse` 命令（该命令需要 android5.0 及以上才能支持。），我们只能采用提示中的最后一种方案：

1.  将电脑和 kindle 连接上同一 WIFI 网络，使他们都处于同一个局域网内，这样可以相互访问到
2.  在 kindle 的 react-native 应用页面，通过摇晃设备打开 `Dev setting` 页面，将电脑的 `js server` 的地址填入即可

在实际操作中发现摇晃设备并不能用，应该是 kindle 缺少传感器无法检测到晃动。但我们可以使用 adb 来模拟晃动事件：

    adb shell input keyevent 82

![img](/frontend/images/react_native_launcher_4.png)

点击 `Settings` 菜单，再点击 `Debug server host & port for device` 菜单，输入电脑上的 `js server` 地址（ip:port），点击确定。重新编译运行后就可以看到应用正常运行了。

![img](/frontend/images/react_native_launcher_5.png)

至此开发框架就可以了，接下来就是正常的开发流程。

## 启动器配置

编辑 `android/app/src/main/AndroidManifest.xml` 文件，在 `intent-filter` 标签下添加如下内容：

    <category android:name="android.intent.category.HOME" />
    <category android:name="android.intent.category.DEFAULT" />

<details>
<summary>现在 <code>AndroidManifest.xml</code> 内容如下：</summary>

    <manifest xmlns:android="http://schemas.android.com/apk/res/android"
      package="com.booklauncher">
    
        <uses-permission android:name="android.permission.INTERNET" />
    
        <application
          android:name=".MainApplication"
          android:label="@string/app_name"
          android:icon="@mipmap/ic_launcher"
          android:roundIcon="@mipmap/ic_launcher_round"
          android:allowBackup="false"
          android:theme="@style/AppTheme">
          <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:configChanges="keyboard|keyboardHidden|orientation|screenSize|uiMode"
            android:launchMode="singleTask"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
                <category android:name="android.intent.category.HOME" />
                <category android:name="android.intent.category.DEFAULT" />
            </intent-filter>
          </activity>
          <activity android:name="com.facebook.react.devsupport.DevSettingsActivity" />
        </application>
    
    </manifest>

</details>

这样配置后重新编译启动应用，再点击 `Home` 键返回桌面便可以看到让你选择桌面程序了

![img](/frontend/images/react_native_launcher_6.png)

后续等开发了再补上...
