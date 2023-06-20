---
title: VSCode Snippets：提升开发幸福感的小技巧
date: 2022-03-25 13:15:43 +0800
categories: [前端]
tags: [vscode]
---

![evelyn-clement-TjvEfjXIb\_s-unsplash.jpg](/assets/img/blogs/2eed42ea-e37b-4c23-ac17-7445b5a45dc3.jpeg)
说到前端开发使用的IDE，相信很多同学第一反应会是VSCode。没错，微软出品的VSCode凭借优秀的性能表现和强大的功能，迅速占领了IDE市场的首席。到2021年，全球71%的开发者（不单止前端开发）在使用VSCode。了解我们日常开发中接触最多的工具，充分挖掘VSCode提供的强大能力，会使我们的开发事半功倍。本文就来讲解一下VSCode Snippets是什么以及如何提升我们开发的幸福感。

## 什么是VSCode Snippets

Snippet: 片段。VSCode Snippets，意指VSCode里预定义的代码片段或者代码模板，快速实现代码补全。

你可能没听说过VSCode Snippets，但你一定在开发中使用过。最常见的应该是`console.log`和`for循环`。比如，当你输入`log`，就会弹出提示，按Tab键或者Enter键，`log`就会变成`console.log()`，光标定位在括号中间的位置。

![snippet.gif](/assets/img/blogs/90016fe3-82f0-40ed-87ae-54b0e0bdf78e.gif)

## 分类

### 按来源分

VSCode Snippets包括内置Snippets、扩展Snippets和自定义Snippets。我们可以通过⇧⌘P 快捷键打开命令面板，选择`Insert Snippets`就可以看到当前文件对于语言的所有Snippets。

前面讲到的`console.log`和`for循环`都是内置Snippets。另外，Emmet Snippets也内置到了VSCode，主要处理html、css、jsx等。

扩展Snippets是VSCode Extension提供的snippets。我们可以通过搜索`@categery:"snippets"`来查找提供想要的snippets的extension。
![image.png](/assets/img/blogs/a3712160-2c29-4d68-a937-7fe7449909f9.png)
比如，如果你安装了`Javascript(ES6) code snippets`这个扩展，就可以使用很多快捷输入了。
![image.png](/assets/img/blogs/ccd2e5de-8b52-418e-a40f-36b5471b4334.png)
自定义Snippets，后面重点说。

### 按作用范围分

包括全局的snippets（跨工程，不分语言）、语言特定的snippets（js、ts、tsx等），以及只在当前工程有效的snippets（只对该工程开启的extension或者.vscode下自定义的`code-snippets`文件）。

> 想要多人共享snippets，可以开发VSCode Extension或者在.vscode下创建snippets并提交到代码仓库。

下面就来重点讲一下自定义VSCode Snippets。

## 自定义Snippets

首先看一个例子：

```json
{
  "Print to console": {
    "scope": "javascript,typescript",
    "prefix": "log",
    "body": [
        "console.log('$1');",
        "$2"
    ],
    "description": "Log output to console"
  }
}
```

可以看到，一个snippet包含几个关键组成部分：

1.  名称：上面的`Print to console`，出现在提示面板条目的右侧，建议取特殊一点的名称，容易区分要用哪一条snippet；
2.  scope：限定作用的语言，只有在编辑对应语言的文件才会显示该snippet；
3.  prefix：当你的输入的字符能匹配上prefix（子串匹配也行，比如：输入`fc`能匹配上`for-const`），该snippet就会出现在提示面板上；
4.  body：要插入的模板内容，可以是字符串或者数组，如果是数组，会以`join('\n')`拼接成字符串展示。后面详细讲；
5.  description：描述，方便自己或他人了解该snippet的用途。

body里的内容遵循[TextMate](https://manual.macromates.com/en/snippets)语法规范，主要有以下几个点：

### Tabstop

`$数字`表示点击Tab时定位的位置，多次按Tab会按数值从小到大依次定位。但是`$0`比较特殊，它永远是最后才定位到的位置，所以上面for of循环的例子，多次Tab定位的顺序应该是：`$1` -> `$2` -> `$0`。多个数值相同的Tab会同步所有位置的更改。

### Placeholder

`${2:element}`是Tab的特殊形式，`element`是占位字符，表示这个位置插入`element`字符串，第2次Tab时选中`element`。Placeholder支持嵌套，比如：`${1:another ${2:placeholder}}`。

### 选项

Placeholder可以设置成特定几个选项，允许用户从提供的选项中选择。格式为`${1|one,two,three|}`，选项用管道符号包裹，用逗号分割。插入snippet后，并定位到当前Placeholder，会弹出选项框让用户选择。

### 变量

VSCode Snippets可以通过`$name`或者`${name:default}`的形式使用全局变量。具体能使用哪些全局变量，可以参考[官方文档](https://code.visualstudio.com/docs/editor/userdefinedsnippets#_variables)。

假如你要写一个React Function组件模板的snippet，根据文件名生成组件名，简单版你就可以这样写：

```json
{
  "React Function Component": {
		"prefix": ["rfc"],
		"body": ["const $TM_FILENAME_BASE = () => {", "\treturn (", "\t\t$0", "\t);", "};", "export default $TM_FILENAME_BASE;"],
		"description": "React函数组件"
	}
}
```

又比如你想获取粘贴板的内容，可以使用`${CLIPBOARD: defaultText}`，当粘贴板内容为空时，会用`defaultText`作为默认值填充。

如果变量找不到，则变量名会作为普通文本插入。

### 转换

变量和Placeholder在插入之前都可以做转换处理，一般通过正则匹配的方式做文本替换或格式化，形式为

    /<regexp>/<format|text>/options

如果要移除文件名的后缀，可以这样写`${TM_FILENAME/(.*)\\..+$/$1/}`，效果等同于`${TM_FILENAME_BASE}`。

如果要将文件名全大写处理，可以这样写`${TM_FILENAME/(.*)/${1:/upcase}/}`。

除了正则匹配、格式化处理，我们还能使用条件语句来处理逻辑。这里举一个stackoverflow上找到的例子：

```json
{
  "color conditional": {
    "prefix": "_hex",
    "body": [
      "let color = '${1}';",      
      "let hex = '${1/(white)/${1:?#fff:#000}/}';"   
    ],
    "description": "conditional color"
  }
}
```

如果输入是`white`，按Tab会替换成`#fff`，否则替换成`#000`。

更多的转换方式可以参照[官方文档](https://code.visualstudio.com/docs/editor/userdefinedsnippets#_grammar)，不过我觉得正则匹配、格式化处理、条件语句已经满足日常大多数情况了。

## 实战

自从使用了react hooks，我们项目开发中就规定了所有函数必须使用`useCallback`包裹。于是，日常编码中就需要大量重复输入`useCallback`。这时可以定义下面的snippet快速插入`useCallback`方法：

```json
{
  "useCallback wrap": {
    "prefix": "uc",
    "body": ["useCallback(() => {", "\t$0", "}, [])"],
    "description": "自动创建useCallback"
  }
}
```

`useMemo`也是类似的。

另外一个场景是，我们平时写React组件时重复地写着`import 'react'`、`const ComponentName`、`export default ComponentName`之类的代码。这时候我们可以把这部分抽取成snippet，瞬间完成多行代码编写。这里我提供一份我定义的snippet供大家参考：

```json
{
  "TS React FC": {
    "prefix": "comp",
    "body": [
      "import { FC } from 'react';",
      "",
      "interface ${TM_FILEPATH/(^.+\\/(.+)\\/index\\.tsx$)|(^.+\\/(.+)\\.tsx$)/${2:/capitalize}${4:/capitalize}/i}Props {",
      "",
      "}",
      "",
      "const ${TM_FILEPATH/(^.+\\/(.+)\\/index\\.tsx$)|(^.+\\/(.+)\\.tsx$)/${2:/capitalize}${4:/capitalize}/i}: FC<${TM_FILEPATH/(^.+\\/(.+)\\/index\\.tsx$)|(^.+\\/(.+)\\.tsx$)/${2:/capitalize}${4:/capitalize}/i}Props> = (props) => {",
      "\treturn (",
      "\t\t$0",
      "\t);",
      "};",
      "",
      "export default ${TM_FILEPATH/(^.+\\/(.+)\\/index\\.tsx$)|(^.+\\/(.+)\\.tsx$)/${2:/capitalize}${4:/capitalize}/i};"
    ],
    "description": "React Component模板"
  }
}
```

上面的snippet会在`src/components/Button/index.tsx`或者`src/components/Button.tsx`文件内插入以下代码：

```typescript
import { FC } from 'react';

interface ButtonProps {

}

const Button: FC<ButtonProps> = (props) => {
  return (
  
  );
};

export default Button;
```

另外，如果大家平时有什么有用或者有趣的snippet，也欢迎分享给我。

## 总结

1.  VSCode Snippets是一段预定义的代码模板，可以帮助我们快速插入代码，让重复劳动变得轻松；
2.  使用snippet时，可以先看VSCode是否有内置的或者是否有extension提供了snippet，然后才考虑自定义。
3.  自定义snippet可以设置Tab停留位置、Placeholder、选择项、变量以及转换，这些能力可以让我们写出灵活、有用的代码模板。

## 参考资料

1.  <https://www.ithome.com/0/567/643.htm>
2.  <https://code.visualstudio.com/docs/editor/userdefinedsnippets>
3.  <https://macromates.com/manual/en/snippets>
4.  <https://stackoverflow.com/questions/57381007/vscode-if-else-conditions-in-user-defined-snippet>
