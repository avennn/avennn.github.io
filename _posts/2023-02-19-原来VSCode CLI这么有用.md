---
title: 原来VSCode CLI这么有用
date: 2023-02-19 16:25:05 +0800
categories: [前端]
tags: [vscode, cli]
---

![vscode.jpg](/assets/img/blogs/630266f6-94d1-4769-95fe-49dae5881c57.jpeg)
说到VSCode CLI工具，可能大家比较陌生，因为在日常工作中它不是必须的。但鉴于它有些功能还比较实用，并且最近我在技术上的一些想法刚好可以借助它来实现，所以这篇文章就来聊聊VSCode CLI那些实用的功能。

VSCode CLI的shell命令叫做`code`，后面都会用`code`来指代VSCode CLI工具。

## code实用功能

### 打开最近一个会话

`code`后面不带任何选项或参数执行，会打开VSCode最近一个会话。比如，如果你最近打开了`projectA`，无论现在`projectA`是否被其他窗口覆盖或者你已经退出VSCode，下面的命令都能快速打开`projectA`：

```bash
$ code
```

如果你正在使用shell，这个命令应该能帮助你迅速打开VSCode或者定位到刚才编辑的文件。

### 打开特定的项目

在这里我想问大家平时都是怎样用VSCode打开某个项目的，都是按以下步骤执行吗？

1.  点击VSCode图标
2.  点击菜单栏File
3.  点击Open
4.  在Mac的Finder里找到并打开

我就不是，我习惯了使用shell，觉得命令行操作比在Finder里查找要快。

`code .`命令是我平时用得最多的，它可以快速地在VSCode打开当前目录的项目。

我的所有项目都是放在一个固定的目录下，所以我只要先`cd`到项目目录下，再执行`code .`就好了。

当然，你也可以使用`code <folder>`的方式打开项目，效果是一样的。

### 跳转到文件的行列

`code -g <file>:<line>:<character>`命令可以快速跳转到文件某一行的某个字符。比如，下面这个命令会打开`index.ts`文件，光标定位到第18行，`index`为8的字符前面的位置。

```bash
$ code -g /project-path/src/index.ts:18:8
```

现在的一些dev工具比如[react-dev-inspector](https://github.com/zthxxx/react-dev-inspector)和[vue-devtools](https://devtools.vuejs.org/)，它们能够让开发者点击DOM元素即可在VSCode打开并定位到对应的源码位置。原理都是在dev server运行的时候获取源码的位置信息并插入到DOM元素上，然后开发者点击DOM时给dev server发送位置信息，dev server再调用`code`的能力跳转源码。

### 文件对比

如果你想快速对比两个文件，可以使用以下命令：

```bash
$ code -d file-path-a file-path-b
```

这对习惯使用VSCode对比文件差异以及解决冲突的同学来说应该比较有用。

### 插件操作

这是我近期发现的最让我喜欢的功能了，包括以下几个点：

*   `code --list-extensions --show-versions`：以`<publisher>.<extensionName>@<version>`的形式罗列所有已安装的插件；
*   `code --install-extension <ext>`：安装插件，可以加上`--force`选项防止弹窗提示；
*   `code --uninstall-extension <ext>`：卸载插件。

想象一下，如果让你来开发一个前端工程的脚手架，你会做哪些事情？

仿照市面上大部分的脚手架，当然会给用户提供editorConfig、eslint、prettier等代码格式相关的配置。但完成这些，脚手架只有90分。实际上，要想eslint等生效，用户还得安装相应的VSCode插件和配置`settings.json`。

`settings.json`还好说，可以在`.vscode`目录下创建`settings.json`实现团队成员间配置的共享以及覆盖本地配置，省去团队成员手动配置的麻烦和避免开发配置不一致的问题。

至于VSCode插件，一般来说，我们会让用户自己去安装或者默认他已经安装了。但对于前端小白或者新入职的同事来说，这无疑是痛苦的，也是优秀的脚手架开发者不能容忍的。这时，上面几个命令就发挥作用了。

`--list-extensions`查看用户是否安装了某个插件，如果没有，则使用`--install-extension`安装。

可以想象，借助上面几个操作插件的命令，配合`.vscode`，脚手架可以完全无感地帮用户配置好开发环境，并且能够保证团队里每个人的配置都是一样的，不用担心突然有一天某个新同事跑过来说他的eslint不生效。

> 注意：插件操作相关的命令权力有点大，要小心使用。

## code的安装

有的同学可能会说，要使`code`生效，不得手动将`code`命令安装到全局环境变量`PATH`上吗？

在Mac上是这样的，但我们也能通过`/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code`这个路径直接调用`code`。

对于Windows、Linux系统，VSCode安装时`code`就会自动添加到`PATH`，可以直接调用`code`。

所以，脚手架可以做一定的封装，避免用户手动添加环境变量。

## 总结

这篇文章只介绍了VSCode CLI的一些我认为比较实用的功能，其他的诸如切换语言、性能监控等功能并没有介绍，大家可以通过文末资料里的链接跳转官网去查看。

最近我在简单封装`code`相关的命令，希望提供一套基础的能力给其他node工程直接调用，项目地址在：<https://github.com/avennn/vsc-commander>，欢迎大家使用和pr。如果觉得还不错的话，也欢迎给个star。

## 参考资料

1.  <https://code.visualstudio.com/docs/editor/command-line>
2.  <https://code.visualstudio.com/docs/setup/mac>
3.  <https://github.com/zthxxx/react-dev-inspector>
