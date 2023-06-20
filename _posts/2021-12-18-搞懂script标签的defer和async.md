---
title: 搞懂script标签的defer和async
date: 2021-12-18 12:07:51 +0800
categories: [前端]
tags: [js]
---

![istockphoto-1181207540-170667a.jpeg](/assets/img/blogs/efa03688-558a-45c6-b8af-85dd2d8411bd.jpeg)

> HTML5给`<script>`增加了两个布尔属性，`defer`和`async`，两者在使用上有点像又有点区别，很容易混淆。本文尝试理清之间的关系。

## defer

`defer script`不会阻塞其他脚本的下载和HTML解析，但它会等到其他DOM构建完成才执行，然后才会触发`DOMContentLoaded`事件。也就是说，如果`defer script`下载得快，需要等一会（DOM构建完成）才执行。`defer script`有点像放在body最后面的script，但下载不受页面阻塞。

```html
<!DOCTYPE html>
<head>
  <script src="/scripts/defer_script.js" defer></script>
</head>
<body>
  <!-- 10000项，HTML解析比较慢 -->
  {% for item in arr %}
  <p>Number {{ item }}</p>
  {% endfor %}
</body>
```

![defer\_HFFS.jpg](/assets/img/blogs/7e9bac96-bd2f-431a-a6be-b856a83ff35e.jpeg)
当`defer script`放在`<head>`里，HTML解析比较慢时，`defer script`下载完之后没有立即执行，而是等到document最后几个节点解析时才执行。
`defer script`会阻塞后面的`defer script`的执行，但不会阻塞后面的`async script`和普通script的执行。

```html
<!DOCTYPE html>
<head>
  <script src="/scripts/defer_script1.js?t=50" defer></script>
  <script src="/scripts/defer_script2.js" defer></script>
</head>
<body>
  {% for item in arr %}
  <p>Number {{ item }}</p>
  {% endfor %}
</body>
```

![defer2\_HFFS.jpg](/assets/img/blogs/1795a0fd-551e-48b2-af18-856cb2a0b110.jpeg)
`defer_script1`在`defer_script2`之前，但是下载比较慢，最终依然是`defer_script1`先执行。
把`defer_script2`的defer去掉或者改成async，都是`defer_script2`先执行。

## async

`async script`的下载同样不会阻塞其他脚本的下载和HTML解析，但是执行会阻塞HTML解析。
想象这样的场景，`async script`下载很快，HTML解析速度一般，`async script`执行时间很长。可以看到，`async script`的执行阻塞了HTML解析。
![HFSM.png](/assets/img/blogs/9b61b915-f7ce-4dbc-8841-b5f9a49a0f9c.png)
`async script`执行顺序不受前面的`defer script`或者`async script`影响，但会被前面的普通script的执行阻塞。

```html
<!DOCTYPE html>
<head>
  <script src="/scripts/async_script2.js?t=50" async></script>
  <script src="/scripts/async_script1.js" async></script>
</head>
<body>
</body>
```

![async\_multi\_order.jpg](/assets/img/blogs/62daa680-dced-4d39-8fff-0146391b82fc.jpeg)
`async_script2`在document中位置比`async_script1`靠前，但由于网络请求会延时约50ms，最终执行也比`async_script1`晚。

## 结论

1.  相同点
    1.  只用于外联script，`<script>`没有src属性时忽略该defer、async属性；
    2.  script下载与HTML解析并行。
2.  不同点
    1.  `defer script`的执行在HTML解析完成之后，而`async script`的执行会阻塞HTML解析；
    2.  多个`defer script`的执行顺序与它们在document出现的顺序一致，`async script`的执行顺序依赖于它们下载完成的快慢。
    3.  同时使用`defer`、`async`，`async`的优先级更高。

## 应用场景

1.  像jquery之类的有依赖关系的script，建议使用defer，保证jquery执行完才执行其他三方脚本；
2.  像数据埋点之类相对独立的script，建议使用async，但是要注意如果脚本下载得比较快，可能影响页面性能。

## 参考资料

1.  <https://javascript.info/script-async-defer>
2.  <https://www.growingwiththeweb.com/2014/02/async-vs-defer-attributes.html>
3.  <https://www.digitalocean.com/community/tutorials/html-defer-async>
