+++
title = "React 嵌入 Tableau 图表"
summary = "在 react 中嵌入 tableau server 的图表"
date = 2020-11-22T20:03:34+08:00
draft = false
tags = ["react", "tableau"]
categories = ["frontend"]
+++

# React 嵌入 Tableau 图表

## 前置工作

想要将 tableau server 的图表嵌入网页中，首先要解决的是身份认证的问题。工作原理可以参考[官方文档](https://help.tableau.com/current/server/zh-cn/trusted_auth.htm)。
从文档中可以看出，要解决以下几个问题：

-   采用兑换票证（ticket）的方式来进行身份验证，需要将发送获取票证的服务器添加到 tableau server 的受信任列表中。
-   为了让用户在访问嵌入视图时成功进行身份验证而不提示登录，浏览器必须配置为允许第三方 Cookie。经过测试，发现 chrome, safari 默认关闭了第三方 Cookie 的支持，firefox 默认支持第三方 Cookie。
-   如果要嵌入工作簿，需要提升票证的权限。

当服务器已经加入到 tableau server 的受信任列表中（注意添加完需要重启 tableau server 服务），可以在该服务器上执行如下命令来测试获取票证是否成功（注意将地址，用户名和站点名替换成实际值）：

    curl -X POST https://your.tableau.addr/trusted?username=username&target_site=sitename

如果返回 -1，说明配置还有地方不对，没能正确地获取到票证。

## 嵌入代码

### 引入 js

首先需要引入 tableau server 的 js 文件。这里用的是 2019.1 的 tableau server 版本。然而根据[官方文档](https://help.tableau.com/v2019.1/api/js_api/en-us/JavaScriptAPI/js_api_concepts_get_API.htm)上记载的 js 版本引入之后发现用不了，最后测试出来应该引用 tableau-2.2.2.min.js 文件。

在 react 中引入外部 js 文件可以使用如下方法：

<details>
<summary><code>loadScript(url, callback)</code></summary>

    function loadScript(url, callback) {
      const script = document.createElement('script');
      if (script.readyState) { // IE
        script.onreadystatechange = () => {
          if (script.readyState === 'loaded' || script.readyState === 'complete') {
            script.onreadystatechange = null;
            callback();
          }
        };
      } else { // 其他浏览器
        script.onload = () => {
          callback();
        };
      }
      script.src = url;
      document.getElementsByTagName('head')[0].appendChild(script);
    }

</details>

`url` 就是要引入 js 的地址， `callback` 就是在 js 引入后要执行的操作，这样可以确保 `callback` 函数在 js 加载完成后再执行。


### 编写组件

由于所有的 tableau 图表的嵌入都是一样的，所以我们可以将其分装为组件，代码如下：

<details>
<summary><code>TableauView(url, interval = 60 * 1000)</code></summary>

    const TableauView = (props) => {
      const { url, interval = 60 * 1000 } = props;
      const vizRef = useRef(null);
      const [ticket, setTicket] = useState('init');
    
      let viz;
      let timer;
    
      useEffect(() => {
        async function initViz() {
          if (!viz) {
            const { tableau } = window;
            const res = await axios.get('/auth/ticket');
            setTicket(res);
            if (res === -1) {
              message.warn('获取票证失败，需手动登录tableau server');
            }
            const options = {
              hideToolbar: false,
              height: 'calc(100vh - 1rem)',
              width: '100%',
              onFirstInteractive: () => {
                // setInterval(() => viz.refreshDataAsync(), interval);
              },
            };
            const ticketUrl = url.replace('/t/', '/trusted/').replace('/username/', `/${res}/t/username/`);
            viz = new tableau.Viz(vizRef.current, res === -1 ? url : ticketUrl, options);
          }
          timer = setInterval(() => viz.refreshDataAsync(), interval);
        }
    
        if (MenuStore.activeMenu?.route === route) {
          if (window.tableau) {
            initViz();
          } else {
            loadScript('http://test.tableau.server.com/javascripts/api/tableau-2.2.2.min.js', initViz);
          }
        } else {
          clearInterval(timer);
        }
    
        return () => {
          clearInterval(timer);
          viz?.dispose();
        }
      }, [MenuStore.activeMenu?.route, route]);
    
      return ticket === 'init' ? <Spin loading /> : <div ref={vizRef} />;
    };

</details>

注意将上面的接口地址，tableau server 地址，用户名都替换为实际值。参数中的 `url` 就是 tableau server 图表分享的地址，在组件中做了转换； `interval` 就是自动刷新的时间间隔，默认为60s。

组件编写完成，只需要在想要展示的页面引用即可。

## 疑难杂症

-   firefox 刷新报错

![img](/frontend/images/react_embed_tableau_1.jpg)

在同一个页面内如果刷新了多个分享的链接，在 firefox 上会报错，但是在 chrome 上没有报错。经过排查是 tableau server 的 js 报错，暂时没有别的解决方法，只能限制在同一时间只刷新展示的图表。

-   隐藏 tableu 图表刷新时的 loading

这是 tableau server 自带的加载样式，在网页中嵌入时其实是用 `iframe` 来嵌入的，所以如果网页和 tableau 连接不是同一个域名会有跨域问题，无法修改样式。如果不是跨域则可以覆盖原有样式。

