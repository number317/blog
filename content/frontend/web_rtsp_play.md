+++
title = "Web Rtsp Play"
summary = "网页播放 rtsp 视频流"
date = 2021-08-31T19:30:22+08:00
draft = false
tags = ["video", "rtsp", "ffmpeg"]
categories = ["frontend"]
+++

# 前端播放 rtsp 视频流方案

最近遇到一个需求，办公室里装了很多摄像头，视频采集统一存储到华为的 [`NVR800`](https://support.huawei.com/enterprise/zh/intelligent-vision/nvr800-pid-250982959) 硬盘录像机中，录像机自带 api 接口提供实时视频和回看视频的地址。
可惜格式是 rtsp 视频流，没法在网页中直接播放。在技术支持的群里问了管理员也说没有网页端播放的方案，那只能自己找了。

网上找了一圈很多都是较老的技术了，有用老版本的 chrome 安装 vlc 插件的来播放的，有用 flash 来播放的，而且很多博客抄来抄去都差不多。

最后找到两个看着靠谱的方案：

-   一种是用 `ffmpeg` 的 `wasm` 版直接前端解析转码 `rtsp` 视频流，转成前端能直接播放的格式
-   第二种是写一个服务还是调用 `ffmpeg` 将 `rtsp` 视频流转码，给前端返回新的视频地址

看到这两个方案我感觉第二种是肯定行得通的，第一种方案暂时不清楚，没怎么用过前端 wasm 技术，只能再去搜索一下。

针对第一种方案，去 [`github`](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/67#issuecomment-721452717) 上搜索了一下看看别人有没有用这个的，结果发现暂时还不支持 rtsp 视频流，这是2020年11月4号的回复，后续也没见有啥更新，当他暂时不支持，那就选第二种方案。

方案二的实现就分两步：

-   首先是转码，想着可以用 java 调用 ffmpeg 来实现，但是要转成什么视频流又没有思路。
-   第二步就是找前端能播放视频流的插件，转码的最终目的是为了前端网页中能播放，所以先看看有什么播放器能支持什么格式。

之前在很多网站看视频的时候发现网页端播放的视频很多都以 m3u8 结尾的。
之前好奇下载过发现这是一个文件，里面记录了很多视频分片，最后查了知道这个叫 hls，搜索了之后找到了网页播放 hls 的插件 [hls.js](https://github.com/video-dev/hls.js)。
所以现在目标就明确了，首先将 rtsp 转成 hls, 再用 hls.js 来播放。

## 转码服务

一开始想着自己用 java 调用 ffmpeg 来做转码服务，实现起来应该也不难，但想着这种应该是比较常见的需求，看看有没有轮子。
经过一番搜索，还真找到了一个 [rtsp-stream](https://github.com/Roverr/rtsp-stream.git)，真的是帮了大忙，节约了好多时间，感谢开源大佬的无私奉献。
这个就是正好完全解决了我的需求，而且是用 Go 写的，部署简单，跨平台，而且作者还很贴心的构建了 Docker 镜像。

根据文档介绍，转换接口是 `start` 接口，会返回一个 m3u8 的链接，前端播放器只需要播放这个链接就行。
这些都可以交给后端来实现，后端只需要暴露一个接口返回一个 m3u8 的链接即可。流程如下：

![img](/frontend/images/web_rtsp_play_1.png)


## 前端播放

这里用的是 react, 用 vue 或者别的应该差不多，首先是加载 hls.js 插件

<details>
<summary>load hls.js</summary>

    useEffect(() => {
      if (hlsRef.current) {
        hlsRef.current.detachMedia();
      }
      setLoading(true);
    
      stopVideo();
    
      const meta = document.createElement('meta');
      meta.name = 'referrer';
      meta.content = 'no-referrer';
      document.getElementsByTagName('head')[0].appendChild(meta);
    
      const script = document.createElement('script');
      if (script.readyState) {
        // IE
        script.onreadystatechange = () => {
          if (script.readyState === 'loaded' || script.readyState === 'complete') {
            script.onreadystatechange = null;
            initVideo();
          }
        };
      } else {
        // 其他浏览器
        script.onload = () => {
          initVideo();
        };
      }
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      document.getElementsByTagName('head')[0].appendChild(script);
    
      return () => {
        if (hlsRef.current) {
          hlsRef.current.detachMedia();
        }
        stopVideo();
      };
    }, []);

</details>

`initVideo()` 方法就是具体要设置播放的操作，首先是获取播放地址，然后再将 hls 实例绑定到 `video` 标签上。

<details>
<summary>initVideo()</summary>

    function initVideo() {
      const requestBody = { cameraCode: '1' };
      axios.post('/video/get-url', requestBody).then(res => {
        setUrlInfo(res);
        const video = document.getElementById('realTime');
        const videoSrc = res.uri;
        if (window.Hls.isSupported()) {
          const hls = new window.Hls();
          hlsRef.current = hls;
          hls.loadSource(videoSrc);
          hls.attachMedia(video);
        }
        setLoading(false);
      }).catch(e => {
        // eslint-disable-next-line no-console
        console.log('err: ', e.message);
        message.error('获取本地视频失败');
        setLoading(false);
      });
    }

</details>

最后是加上一个 `video` 标签：

    <video id="realTime" controls="controls" className={`${prefixCls}-video`} />

## 注意事项

-   从 nvr800 获取视频地址时用 tcp 协议，不然在转换服务中会有问题，转出来的视频 hls.js 播放不了，在 vlc 里可以播放。

-   hls.js 只支持 H.264 编码的视频，不支持 H.265 编码的视频。
    
    如果遇到转码没问题，返回的链接能在 vlc 等播放器播放，但在网页中进度条正常，就是黑屏无图像时，可以去 nvr800 查看一下视频编码。

-   结束播放时可以给服务器发送一个请求停止转码，避免浪费资源。

