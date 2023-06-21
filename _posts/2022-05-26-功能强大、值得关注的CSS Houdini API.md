---
title: 功能强大、值得关注的CSS Houdini API
date: 2022-05-26 17:19:00 +0800
categories: [前端]
tags: [css]
image:
  path: /assets/img/blogs/1d0d0ab1-33f2-4be4-94ff-d3d3f108580e.jpeg
---

## 概念

`CSS Houdini API`是CSS引擎暴露出来的一套api，通过这套API，开发者可以直接触及CSSOM，告诉浏览器如何去解析CSS，从而影响浏览器的渲染过程，实现很多炫酷的功能。
它主要包括`Properties and Values API`、`Typed Object Model API`、`Paint API`、`Layout API`、`Animation API`、`Parser API`、`Font Metrics API`等。

![05-spec-coverage-preview-opt.png](/assets/img/blogs/15e946f5-4266-4404-82d6-ac8d0ce20216.png)

## Properties and Values API

该API允许开发者自定义CSS属性，并告诉浏览器该如何解析。细想发现，这与`Web Components`有异曲同工之妙，只不过`Web Components`允许我们自定义HTML标签，而`Properties and Values API`允许我们自定义CSS属性。由此可以看出，Web发展的一个重要趋势是，浏览器会越来越多地暴露底层能力给开发者。
`Properties and Values API`有两种书写形式，一种是js写法：

```javascript
CSS.registerProperty({
  name: '--my-prop',
  syntax: '<color>',
  inherits: false,
  initialValue: '#c0ffee',
});
```

另一种是CSS写法：

```css
@property --my-prop {
  syntax: '<color>';
  inherits: false;
  initial-value: #c0ffee;
}
```

这两种写法是等价的。它做了以下几件事：

*   `name`：定义了属性名（`--my-prop`）；
*   `syntax`：约定了属性的类型（`<color>`，所有支持的类型可以参考[W3C的标准](https://drafts.css-houdini.org/css-properties-values-api/#supported-names)），默认为`*`；
*   `inherits`：规定是否可以继承父元素的属性，默认为`true`；
*   `initialValue`：初始值、出错时兜底的值。

当我们将属性定义为`<color>`类型，就不能赋值给`height`属性，比如：

```css
#app {
  width: 200px;
  height: var(--my-prop); /* 无效，高度为0 */
}
```

但可以赋值给`background-color`

```css
#app {
  width: 200px;
  height: 200px;
  --my-prop: red;
  background-color: var(--my-prop); /* 红色 */
}
```

说了这么多，好像只说了`Properties and Values API`是什么，怎么用。但它如果没有好处，我为什么要用它呢？
不错。这里就举一个🌰吧。
我们知道，如果`background`是纯色的话，颜色切换的动画是很容易实现的，具体查看例子：[CodePen](https://codepen.io/avennn/pen/xxYgWeW)。
但如果`background`是渐变色，然后用`transition`实现背景色切换，CSS就无能为力了，[CodePen](https://codepen.io/avennn/pen/eYVgrze)上可以看到没有动画效果。不过，`Properties and Values API`可以轻松解决这个问题。

```html
<head>
  <title>cssPropertyValueApi</title>
  <script>
    CSS.registerProperty({
      name: '--my-color',
      syntax: '<color>',
      inherits: false,
      initialValue: 'red',
    });
  </script>
  <style>
    .box {
      width: 400px;
      height: 60px;
      --my-color: #c0ffee;
      background: linear-gradient(to right, #fff, var(--my-color));
      transition: --my-color 1s ease-in-out;
    }

    .box:hover {
      --my-color: #b4d455;
    }
  </style>
</head>
<body>
  <div class="box"></div>
</body>
```

效果可以查看[CodePen](https://codepen.io/avennn/pen/PoQWemP)。
浏览器不知道如何处理渐变的转换，但知道如何处理颜色的转换。`registerProperty`方法告诉浏览器`--my-color`是`<color>`类型，所以`transition`能够处理`--my-color`的转换，从而实现渐变背景的动画效果。

## Typed Object Model API

过去很长时间，我们用js操作`CSSOM`都是这么写：

```javascript
// Element styles.
el.style.opacity = 0.3;

// 或者
// Stylesheet rules.
document.styleSheets[0].cssRules[0].style.opacity = 0.3;
```

好像很正常额，但是，如果我们打印一下`opacity`的类型：

```javascript
el.style.opacity = 0.3;
console.log(typeof el.style.opacity); // string
```

很多问号吧，类型竟然是`string`。
再来看看新的`Typed Object Model API`怎么写：

```javascript
// Element styles.
el.attributeStyleMap.set('opacity', 0.3);
typeof el.attributeStyleMap.get('opacity').value === 'number' // true

// Stylesheet rules.
const stylesheet = document.styleSheets[0];
stylesheet.cssRules[0].styleMap.set('background', 'blue');
```

直接赋值变成函数操作，更清晰了。除了`set`方法，还有`has`、`delete`、`clear`等方法。更详尽的api介绍可以到[MDN](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Typed_OM_API)网站上阅读。
元素上多了两个很重要的属性：`attributeStyleMap`和`computedStyleMap`，用来代替之前直接在`style`对象上的操作，后面会详细讲。
而且可以看到，这时`opacity`的类型是正确的。
再看一个例子：

```javascript
el.attributeStyleMap.set('margin-top', CSS.px(10));
el.attributeStyleMap.set('margin-top', '10px'); // string写法也没问题，向下兼容
el.attributeStyleMap.get('margin-top').value  // 10
el.attributeStyleMap.get('margin-top').unit // 'px'

el.attributeStyleMap.set('display', new CSSKeywordValue('initial'));
el.attributeStyleMap.get('display').value // 'initial'
el.attributeStyleMap.get('display').unit // undefined
```

`Typed Object Model API`增加了很多的类：

1.  CSSKeywordValue；
2.  CSSNumericValue；
3.  CSSTransformValue；
4.  ...

还增加了很多有用的方法，如`CSS.px`、`CSS.em`等，效果跟使用`CSSUnitValue`类是一样的，就是更友好的一种形式而已。
属性值是一个对象，包含`value`和`unit`，当我们只想要数值而不想要单位时，可以减少解析这一步的处理。
总的来说，`Typed Object Model API`的设计让我们对样式的操作更明确了，也更像`java`了。

### attributeStyleMap vs computedStyleMap

`attributeStyleMap`和`computedStyleMap`都是用来存放样式的对象，但两者有一些区别。
`attributeStyleMap`是一个对象，而`computedStyleMap`是一个函数。另外，`computedStyleMap`返回一个只读对象，只能执行`get`、`has`、`entities`、`forEach`等操作。
为什么要设计两个map？因为我们设置的样式不一定完全符合约定，`attributeStyleMap`是原始输入的样式，而`computedStyleMap`经过浏览器转换最后实际应用的样式。

```javascript
el.attributeStyleMap.set('opacity', 3);
el.attributeStyleMap.get('opacity').value === 3  // 没有收紧
el.computedStyleMap().get('opacity').value === 1 // 计算样式会收紧opacity

el.attributeStyleMap.set('z-index', CSS.number(15.4));
el.attributeStyleMap.get('z-index').value  === 15.4 // 原始值
el.computedStyleMap().get('z-index').value === 15 // 四舍五入
```

### 小结

`Typed Object Model API`带来了很多好处：

1.  更少的心智负担和bug：比如上面说的opacity的类型问题，可以避免`opacity + 0.5`变成`0.30.5`。又比如，过去样式属性既可以驼峰写法也可以是横杆连接写法，现在只能是横杆连接写法（与CSS一致），我们再也不用在写法上纠结了。

```javascript
el.style['background-color'] = 'red'; // ok
// 等同于
el.style['backgroundColor'] = 'red'; // ok

el.attributeStyleMap.set('background-color', 'red');
```

2.  强大的数学操作和单位转换：我们可以将px单位的值转成cm（厘米），这可能在某些场景下有用。
3.  值的自动修正。
4.  错误处理，可以用try catch语句捕获错误：

```javascript
try {
  const css = CSSStyleValue.parse('transform', 'translate4d(bogus value)');
  // use css
} catch (err) {
  console.error(err);
}
```

5.  性能更佳：js对象转成C++底层对象要比序列化、反序列化string再转C++底层对象快。

## Worklet

Houdini worlets是一套类似于web workers的轻量级接口，允许用户使用浏览器渲染阶段的底层能力。使用方式有点类似service worker，需要引入js文件，并注册模块。Houdini worlets只能运行在https或者localhost上。
Houdini worlets按功能分主要有4类：`PaintWorklet`、`LayoutWorklet`、`AnimationWorklet`和`AudioWorklet`，这里只会介绍前3类。
每种worklet对应着特定的api和特定的渲染阶段（cascade -> layout -> paint -> composite）：

*   Paint Worklet - Paint API - paint
*   Layout Worklet - Layout API - layout
*   AnimationWorklet - Animation API - composite

## Paint API

`Paint Api`允许我们使用类似于canvas 2D的api定义如何绘制image，主要用在一些可以设置image的CSS属性上，比如`background-image`、`border-image`、`list-style-image`等。主要步骤分为3步：

1.  `registerPaint`定义如何绘制；
2.  `CSS.paintWorklet.addModule`注册模块；
3.  在CSS里调用全局的`paint`方法绘制指定模块。

```javascript
// path/to/worklet/file.js
registerPaint('paint-color-example', class {
  static get inputProperties() { 
    return ['--my-color'];
  }
  
  static get inputArguments() { 
    return ['<color>'];
  }
  
  static get contextOptions() { 
    return {alpha: true};
  }

  paint(ctx, size, properties, args) {
    ctx.fillStyle = properties.get('--my-color');
    ctx.beginPath();
    ...
});

// html或者main js
CSS.paintWorklet.addModule('path/to/worklet/file.js');
// 或者引用外部url，但需要https
// CSS.paintWorklet.addModule("https://url/to/worklet/file.js");

```

`registerPaint`里的类有几个方法：

*   `inputProperties`，要使用哪些CSS属性；
*   `inputArguments`，CSS中使用paint函数除了模块名外的其他参数，指定其类型；
*   `contextOptions`，由于使用的是canvas的2D render context绘制，所以可能会设置一些canvas上下文的选项；
*   `paint`：最关键的方法，定义绘制行为。`ctx`的使用和canvas一致，`size`表示绘制的大小，包括width、height等信息，`properties`就是`inputProperties`静态方法里定义的属性，`args`就是`paint`的入参，跟`inputArguments`定义的对应。

`CSS.paintWorklet.addModule`注册模块，可以是本地路径，也可以是外部的url。
最后，在CSS里使用

```css
.example {
  background-image: paint(paint-color-example, blue);
}
```

[Houdini.how](https://houdini.how/)网站上有很多使用`Paint API`实现的炫酷效果，大家可以去看看。

## Layout API

`Layout API`扩展了浏览器layout的能力，主要作用于CSS的`display`属性。
基本写法如下：

```javascript
registerLayout('layout-api-example', class {
  static get inputProperties() { return ['--exampleVariable']; }

  static get childrenInputProperties() { return ['--exampleChildVariable']; }

  static get layoutOptions() {
    return {
      childDisplay: 'normal',
      sizing: 'block-like'
    };
  }

  intrinsicSizes(children, edges, styleMap) {
    /* ... */
  }

  layout(children, edges, constraints, styleMap, breakToken) {
    /* ... */
  }
});
```

*   `inputProperties`，父布局元素使用的属性
*   `childrenInputProperties`，子布局元素使用的属性
*   `layoutOptions`
    *   `childDisplay`，预定义子元素的`display`值，`block`或者`normal`
    *   `sizing`，值为`block-like`或者`manual`，告诉浏览器是否要预先计算大小
*   `intrinsicSizes`，定义盒子或者内容如何适配布局
    *   `children`，子元素
    *   `edges`，盒子边缘
    *   `styleMap`，盒子的Typed Object Model
*   `layout`，布局实现的主要函数
    *   `children`，子元素
    *   `edges`，盒子边缘
    *   `constraints`，父布局的约束
    *   `styleMap`，盒子的Typed Object Model
    *   `breakToken`，分页或者打印时使用的分割符

定义好之后使用，跟`Paint Api`类似

```javascript
// 注册模块
CSS.layoutWorklet.addModule('path/to/worklet/file.js');
```

```css
.example {
  display: layout(layout-api-example); /* 作为一种自定义的dislay */
}
```

目前CSS已经有很多种布局方式了，我们还需要`Layout API`吗？当然需要，做过移动端开发的同学应该知道，瀑布流布局（Masonry）是很常见的。如果我们根据业务定义好这Masonry布局，下次再遇到同样的需求，就可以直接复用了。网上已经有人实现了Masonry布局，大家可以[参考](https://github.com/codeAdrian/houdini-examples/blob/master/layout-api-example/index.html)一下。

## Animation API

扩展浏览器动画的能力，能够监听scroll、hover、click等事件，提供流畅的动画效果。
基本用法：

```javascript
// 定义动画
registerAnimator("animation-api-example", class {
  constructor(options) {
    /* ... */
  }
  animate(currentTime, effects) {
    /* ... */
  }
});
```

`amimate`：动画的主要实现逻辑

*   `currentTime`，时间线上当前的时间；
*   `effects`，动效的集合。

```javascript
// 注册，异步函数
await CSS.animationWorklet.addModule("path/to/worklet/file.js");;

// 动画要作用的元素
const elementExample = document.getElementById("elementExample");

// 定义关键帧动画
const effectExample = new KeyframeEffect(
  elementExample,
  [ /* ... */ ],   /* 关键帧 */
  { /* ... */ },   /* duration, delay, iterations等选项 */
);

/* 创建WorkletAnimation实例并运行 */
new WorkletAnimation(
  "animation-api-example" // 前面定义的动画名
  effectExample,              // 动画
  document.timeline,          // 输入时间线
  {},                         // constructor的参数
).play(); 
```

动画的知识点非常多，不是本文所能涵盖的。
网上有人用Animation API实现了以下的动画效果，具体可以参看[这里](https://github.com/codeAdrian/houdini-examples/blob/master/animation-api-example/gaussian.js)。
![3-image-animation-api.gif](/assets/img/blogs/f241903f-17ac-4050-a169-2f4256c962d8.gif)

## 可以用了吗

![ishoudinireadyyet.com\_.png](/assets/img/blogs/257e9d0e-3196-452a-9b2b-ede9e7d61026.png)
目前只是部分主流浏览器实现了部分API，要谨慎使用，最好判断浏览器是否支持再使用，或者借助polyfill。

## 总结

1.  `Houdini API`是一套功能强大，暴露CSS引擎能力的方案；
2.  优势明显，比如：更友好的API、轻松突破以往CSS有限的能力范围、性能提升；
3.  浏览器实现程度不是很好，很多API还在草案当中，有些API的使用需要借助polyfill。本文并没有提及`Parser API`和`Font Metrics API`，这两个还在提案阶段，以后变数太大；
4.  `Houdini API`还是很值得期待的，大家可以持续关注下。

## 参考资料

1.  <https://www.smashingmagazine.com/2020/03/practical-overview-css-houdini/>
2.  <https://ishoudinireadyyet.com/>
3.  <https://developer.mozilla.org/en-US/docs/Web/Guide/Houdini>
4.  <https://drafts.css-houdini.org/css-properties-values-api/#supported-names>
5.  <https://web.dev/css-props-and-vals/>
6.  <https://developer.mozilla.org/en-US/docs/Web/API/CSS_Typed_OM_API>
7.  <https://developer.chrome.com/blog/cssom/>
8.  <https://houdini.how/>
