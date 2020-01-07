+++
title = "Vue Note"
date = 2019-12-23T09:32:34+08:00
draft = false
tags = ["vue"]
categories = ["frontend"]
+++

# Vue 学习记录

## 常用指令

`vue` 指令带有 `v-` 前缀，以表示这是 `vue` 提供的特性。

* `v-bind`: 将元素节点的属性和 Vue 实例的属性保持一致，简写 `:`
* `v-for`: 绑定数组的数据来渲染一个项目列表
* `v-on`: 添加一个事件监听器，来调用在 Vue 实例中定义的方法，简写 `@`
* `v-model`: 实现表单输入和应用状态之间的双向绑定
* `v-once`: 第一次渲染完成后变为静态内容，所有子元素也受影响
* `v-pre`: 让指定元素被忽略
* `v-cloak`: 去除页面渲染数据时出现闪现的情况
* `v-html`: 把 html 标签渲染成 DOM 显示在页面上
* `v-if`: 条件渲染

## 生命周期

* `beforeCreate`: 实例初始化
* `created`: 实例建立完成
* `beforeMount`: 模板挂载之前
* `mounted`: 模板挂载完成，较多使用
* `beforeUpdate`: 如果 `data` 发生变化，触发组件更新，重新渲染
* `updated`: 更新完成
* `beforeDestroy`: 实例销毁之前（实例还可以使用）
* `destroyed`: 实例已经销毁

## 路由

新建路由实例时，需要指明 `routes` 的值，如果字段和值名字相同，可以简写为 `routes`:

```javascript
import VueRouter from 'vue-router'
import Home from '@/views/Home'
import Book from '@/views/Book'
import About from '@/views/About'
import Login from '@/views/Login'

Vue.use(VueRouter)
Vue.use(Home)
Vue.use(Book)
Vue.use(About)
Vue.use(Login)

const routes = [
  {
    path: '/home',
    component: Home,
    name: 'home'
  },
  {
    path: '/book',
    component: Book,
    name: 'book'
  },
  {
    path: '/about',
    component: About,
    name: 'about'
  },
  {
    path: '/login',
    component: Login,
    name: 'login'
  }
]

export default new VueRouter({ routes: routes })
```
