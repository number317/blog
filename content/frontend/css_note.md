+++
title = "Css Note"
date = 2019-12-23T15:43:48+08:00
draft = true
tags = ["css"]
categories = ["frontend"]
+++

<!-- vim-markdown-toc GFM -->

+ [CSS 笔记](#css-笔记)
  * [列表样式](#列表样式)
  * [选择器](#选择器)
    - [基本选择器](#基本选择器)
    - [属性选择器](#属性选择器)
    - [组合选择器](#组合选择器)
    - [伪类选择器](#伪类选择器)
    - [类名选择器](#类名选择器)
    - [id 选择器](#id-选择器)

<!-- vim-markdown-toc -->

# CSS 笔记

## 列表样式

列表有三种不同的属性: `list-style-type`, `list-style-image`, `list-style-position`。并且应该以这种顺序声明。默认值分别为 `disc`, `outside`, `none`。每一个属性可以单独声明，也可以用简写 `list-style` 声明。

`list-style-type` 的一些可接受的值是 `disc`, `circle`, `square`, `decimal`, `lower-roman`, `upper-roamn`, `none`。

如果想把 `<li>` 的标记换成方型，可以使用下面的样式:

```css
li {
    list-style-type: square;
}
```

效果如下:

<ul>
    <li style="list-style-type: square">foo</li>
    <li style="list-style-type: square">bar</li>
</ul>

`list-style-image` 属性检测列表图标是否是图片，接受 `none` 值或图片的 url:

```css
li {
    list-style-image: url(http://placekitten.com/g/10/10)
}
```

效果如下:

<ul>
    <li style="list-style-image: url(http://placekitten.com/g/10/10)">foo</li>
    <li style="list-style-image: url(http://placekitten.com/g/10/10)">bar</li>
</ul>

`list-style-position` 属性定义列表标记的位置，接受 `inside` 或 `outside` 的其中一个:

```css
li {
    list-style-position: inside;
}
```
<ul>
    <li style="list-style-position: inside">foo</li>
    <li style="list-style-position: inside">bar</li>
</ul>

## 选择器

选择器指定样式生效的元素，css 提供了超过 50 种的选择方式，包括元素，类，id，伪元素，伪类等。

### 基本选择器

* `*`: 全局选择器，选择所有元素
* `div`: 元素选择器，选中了所有 `<div>` 元素
* `.blue.red`: 类选择器，选中了带有 `blue` 和 `red` 类的元素
* `#headline`: id 选择器，选中了 id 为 `headline` 的元素。
* `:pseudo-class`: 伪类选择器，选中了所有带有伪类的元素。如 `:hover`, `:visited`
* `::pseudo-element`: 伪类元素选择器，选中了所有伪类元素。
* `lang(en)`: 选中了有 `:lang` 声明的元素，例如 `<span lang="en">`
* `div > p`: 直系选择器，选中了 `div` 下一层的 `p` 元素

### 属性选择器

* `[attr]`: 选中带有 `attr` 属性的元素，如 `<div attr>`
* `[attr='val']`: 选中带有 `attr` 属性并且值为 `val` 的元素，如 `<div attr='val'>`
* `[attr~='val']`: 选中带有 `attr` 属性并且值为以空格分割包含`val` 的列表的元素，如 `<div attr='val val1 val2'>`
* `[attr^='val']`: 选中带有 `attr` 属性并且值为以 `val` 开头的元素，如 `<div attr='val1 val2'>`
* `[attr$='val']`: 选中带有 `attr` 属性并且值为以 `val` 结尾的元素，如 `<div attr='sth aval'>`
* `[attr*='val']`: 选中带有 `attr` 属性并且值为包含 `val` 的元素，如 `<div attr='somevalwhere>`
* `[attr|='val']`: 选中带有 `attr` 属性并且值为 `val` 或 `val` 后面立即跟随 `-` 的元素，如 `<div attr='val'>`

属性值可以用单引号或双引号包裹，没有引号可能也能运行，但是不符合标准，也不推荐。

### 组合选择器

* `div span`: 后代选择器，选中了所有在 `<div>` 中的 `<span>` 元素，可以非直系
* `div > span`: 子选择器，选中了 `div` 下一层的 `span` 元素，必须为直系
* `a ~ span`: 兄弟选择器，选中了 `a` 元素后面所有同级的 `span` 元素
* `a + span`: 兄弟选择器，选中了 `a` 元素后面同级且相邻的 `span` 元素

### 伪类选择器

* `:active` 被用户激活的元素，如被点击
* `:any`: 可以快速构建类似的选择器集合，通过建立包含所有包含项的组来匹配。当因为其中一个项目是不同而导致重复时可以使用改伪类来简化
* `:target`: 用于选中 id 和当前 url 片段(以`#`标识的)匹配的元素
* `:checked`: 用于选中处于选中状态的 `radio`, `checkbox`, `option` 等组件
* `:default`: 用于选中默认状态的表单元素，如默认处于 select 或 checked 的元素
* `:disabled`: 用于选中处于 `disabled` 状态的元素
* `:empty`: 用于选中没有子元素的元素
* `:enabled`: 用于选中处于 `enabled` 状态的元素
* `:first`: 打印文档时第一页的样式。只能改变 margins、 orphans、 widows、文档什么时候换页。别的所有css样式都会被忽略
* `:first-child`: 相对于父元素而言是第一个子元素的元素
* `:first-of-type`: 选中所有父元素中第一个出现的改种类型的元素，如 `p:first-of-type` 选中所有在父元素中第一个出现的 `p` 元素
* `:focus`: 选中获得焦点的元素
* `:focus-within`: 选中获得焦点的元素或有子元素获得焦点的元素
* `:full-screen`: 选中当前处于全屏显示模式的元素。 它不仅仅选择顶级元素，还包括所有已显示的栈内元素
* `:hover`: 选中被鼠标指针覆盖但不是激活的元素
* `:indeterminate`: 选中状态不确定的表单元素
* `:in-range`: 选中 `<input>` 元素，其当前值处于属性 `min` 和 `max` 限定的范围之内
* `:invalid`: 选中 `<input>` 元素，其当前值相对于 `type` 属性是非法的
* `:lang`: 基于元素语言来匹配页面元素
* `:last-child`: 相对父元素是最后一个子元素的元素
* `:last-of-type`: 选中所有父元素中最后一个出现的改种类型的元素，如 `p:last-of-type` 选中所有在父元素中最后一个出现的 `p` 元素
* `:left`: 打印文档时在左边的页面
* `:link`: 没有被访问过的链接
* `:not()`: 匹配不符合一组选择器的元素。由于它的作用是防止特定的元素被选中，它也被称为反选伪类。`not(p)` 选中不是 `<p>` 标签的元素
* `:nth-child`: 首先找到所有当前元素的兄弟元素，然后按照位置先后顺序从 1 开始排序，选择的结果为 `:nth-child` 括号中表达式`(an+b)`匹配到的元素集合 `(n=0，1，2，3...)`
* `:nth-of-type`: 匹配那些在相同兄弟节点中的位置与模式 `an+b` 匹配的相同元素。
* `:only-child`: 匹配那些在父节点中是唯一子节点的元素
* `:optional`: 表示任意没有 `required` 属性的 `<input>`，`<select>` 或 `<textarea>` 元素使用它
* `:out-fo-range`: 和 `in-range` 相反
* `:placeholder-show`: 选中当前显示 `placeholder` 文字的元素
* `:read-only`: 选中用户不可编辑的元素
* `:read-write`: 选中用户可写的元素
* `:right`: 打印文档时在右边的页面
* `root`: 匹配文档树的根元素，对 HTML 来说就是 `<html>` 元素
* `scoope`: 匹配作为选择符匹配元素的参考点(css的作用域或作用点)。在HTML中，可以使用 `<style>` 的scoped属性来重新定义新的参考点。如果HTML中没有使用这个属性，那么默认的参考点(css的作用域或作用点)是 `<html>`
* `visited`: 选中被访问过的 url

### 类名选择器

类名选择器选择带有对应类名的目标。例如 `.warning` 选中下面的 `<div>` 元素:

```css
<div class="warning">
    <p>This would be some warning copy.</p>
</div>
```

### id 选择器

通常使用 id 选择器时用 `#idname` 来选中元素，这种写法优先级比较高，可以覆盖很多选择器的样式。也可以写成属性选择器的形式 `[id=idname]`，这种写法优先级比较低，容器被别的选择器样式覆盖。
