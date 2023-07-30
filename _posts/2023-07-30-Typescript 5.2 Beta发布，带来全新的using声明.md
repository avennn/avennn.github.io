---
title: Typescript 5.2 Beta发布，带来全新的using声明
date: 2023-07-30 22:28:01 +0800
categories: [前端]
tags: [js]
permalink: /posts/4064bc7a-fc4e-4e99-8555-0b2298436345/
image:
  path: /assets/img/blogs/b5bd3da2-34ff-4fca-95f2-f1440f2b66ac.png
---


这些年typescript发展得如火如荼，从它的发展路线来看，它不单单弥补了js在类型方面的缺陷，还超前带来许多新的语言特性。今年6月底，typescript 5.2 Beta发布，其中带来了很重要的一个特性：using声明，方便我们对资源进行管理。

## 背景

编程的世界需要管理很多资源，这些资源使用完之后需要及时释放，比如数据库操作完之后断开连接、文件open并操作完后要close掉、线程占用之后要及时解开线程锁等等。

就拿我们最熟悉的nodejs来说，`fs.open`和`fs.close`总是成对出现，`fs.open`打开文件，方便执行多次操作，`fs.close`最后关闭文件，释放资源。比如下面的例子：

```javascript
import fs from 'node:fs/promises';

async function doSomething() {
  const path = ".some_temp_file";
  const file = await fs.open(path, "w+");

  // use file...
  if (someCondition()) {
    // do some more work...
    methodA();
    const result = methodB();
    methodC();

    // Close the file and delete it.
    await fs.close(file);
    await fs.unlink(path);
    
    return result;
  }

  methodD();
  // Close the file and delete it.
  await fs.close(file);
  await fs.unlink(path);
}
```

这段代码有什么问题？能用，但不够优雅，因为它在不同的位置重复写了“清理”代码（`fs.close`和`fs.unlink`）。该如何优化？目前似乎只能使用`try/finally`：

```javascript
import fs from 'node:fs/promises';

async function doSomething() {
  const path = ".some_temp_file";
  const file = await fs.open(path, "w+");

  try {
    // use file...
    if (someCondition()) {
      // do some more work...
      methodA();
      const result = methodB();
      methodC();

      return result;
    }

    methodD();
  } finally {
    // Close the file and delete it.
    await fs.close(file);
    await fs.unlink(path);
  }
}
```

现在好了一些，但依然不是最好的方案。

为了保证离开作用域时释放资源，我们使用了`try/finally`，代码层级增加。如果有多个需要释放的资源，加上资源在释放过程会抛出错误，我们可能需要更深层次的`try/finally`语句的包装。这有点像回调地域，代码的可读性和可维护性直线下降。

另外，上面没有考虑到有依赖关系的资源的释放顺序，以及资源释放过程中错误的处理。

## using声明

`using`关键字是除了`var`、`let`、`const`以及全局声明之外的变量声明的方式。基本用法如下：

```typescript
import fs from 'node:fs';

class TempFile implements Disposable {
  #path: string;
  #handle: number;

  constructor(path: string) {
    this.#path = path;
    this.#handle = fs.openSync(path, 'w+');
  }

  [Symbol.dispose]() {
    // Close the file and delete it.
    fs.closeSync(this.#handle);
    fs.unlinkSync(this.#path);
  }
}

function doSomething() {
  using file = new TempFile(".some_temp_file");
}
```

它声明的变量是一个对象，这个对象上需要有`[Symbol.dispose]()`方法，定义具体如何释放资源。using声明代表着，当离开变量所在作用域时，程序会自动执行变量的`[Symbol.dispose]()`方法。

> Symbol.dispose是新标准提出的Symbol上的一个新属性，用于资源释放。

using声明带来这些好处：

1.  避免资源释放相关代码的重复调用，保证离开作用域之前执行；
2.  避免`try/finally`的使用以及嵌套；
3.  统一实现，目前ECMAScript Iterators、WHATWG Stream Readers、NodeJS FileHandles的资源释放方法都不一样，新标准出来之后，这些实现有望达成统一，那样就不用再手动封装`[Symbol.dispose]()`方法了；
4.  对于读写锁、IO操作等十分有用；
5.  配合`shared struct`(一个新的提议)使用。

using声明的实现可以用下面的代码表示：

```javascript
{
  const $$try = { stack: [], error: undefined, hasError: false };
  try {
    ... // (1)

    const x = expr1;
    if (x !== null && x !== undefined) {
      const $$dispose = x[Symbol.dispose];
      if (typeof $$dispose !== "function") {
        throw new TypeError();
      }
      $$try.stack.push({ value: x, dispose: $$dispose });
    }

    const y = expr2;
    if (y !== null && y !== undefined) {
      const $$dispose = y[Symbol.dispose];
      if (typeof $$dispose !== "function") {
        throw new TypeError();
      }
      $$try.stack.push({ value: y, dispose: $$dispose });
    }

    ... // (2)
  }
  catch ($$error) {
    $$try.error = $$error;
    $$try.hasError = true;
  }
  finally {
    while ($$try.stack.length) {
      const { value: $$expr, dispose: $$dispose } = $$try.stack.pop();
      try {
        $$dispose.call($$expr);
      }
      catch ($$error) {
        $$try.error = $$try.hasError ? new SuppressedError($$error, $$try.error) : $$error;
        $$try.hasError = true;
      }
    }
    if ($$try.hasError) {
      throw $$try.error;
    }
  }
}
```

这段代码可以解释以下这些特性。

### 必须要有Symbol.dispose

使用`using`关键字声明的对象必须有`[Symbol.dispose]()`方法，否则抛出`TypeError`。

### 资源释放顺序

使用`using`声明的变量，资源释放顺序遵循栈FILO的逻辑。也就是说，下面代码中，在离开`run`函数的作用域之前，`b[Symbol.dispose]()`先于`a[Symbol.dispose]()`执行。

```javascript
function run() {
  using a = funcA();
  using b = funcB();
  // b[Symbol.dispose]();
  // a[Symbol.dispose]();
}
```

为什么这么设计？因为资源b有可能依赖于资源a，如果a先释放，则b的释放会出错。

### 错误处理

无论是执行主体代码还是资源释放过程都可能抛出错误，如果主体代码抛出错误，比如下面：

```javascript
function run() {
  function doSomething() {
    using a = funcA();
    throw new Error('主体代码错误');
    // dispose a
  }
  
  try {
    doSomething();
  } catch (e) {
    console.error(e);
  }
}
```

资源a是否就无法释放了？

另外，如果资源a在释放过程中抛出错误，这个错误会覆盖主体错误吗？如何用一个error变量保留多个错误信息？

为此，标准引入了一个新的错误类型`SuppressedError`，它继承于`Error`对象。它的实现很简单，看一下tsc的编译结果：

```javascript
function SuppressedError(error/* 资源释放错误 */, suppressed/* 主体错误 */, message) {
  const e = new Error(message);
  e.name = 'SuppressedError';
  e.error = error;
  e.suppressed = suppressed;
  return e;
}
```

错误对象结构如下：

```javascript
const e = {
  message: 'An error was suppressed during disposal.',
  name: 'SuppressedError',
  error: {
    message: '资源释放错误',
    name: 'Error',
    stack: '...',
  },
  suppressed: {
    message: '主体错误',
    name: 'Error',
    stack: '...',
  },
  stack: '...',
}
```

值得注意的是，资源释放抛出的错误放在`e.error`里，主体错误放在`e.suppressed`里。

如果多个资源在释放过程都抛出错误呢？

```javascript
function run() {
  function doSomething() {
    using a = funcA();
    using b = funcB();
    throw new Error('主体错误');
    // b[Symbol.dispose]() throw new Error('b错误')
    // a[Symbol.dispose]() throw new Error('a错误')
  }
  
  try {
    doSomething();
  } catch (e) {
    console.error(e);
  }
}
```

这时`e`的结构是：

```javascript
const e = {
  message: 'An error was suppressed during disposal.',
  name: 'SuppressedError',
  error: {
    message: 'a错误',
    name: 'Error',
    stack: '...',
  },
  suppressed: {
    message: 'An error was suppressed during disposal.',
    name: 'SuppressedError',
    error: {
      message: 'b错误',
      name: 'Error',
      stack: '...',
    },
    suppressed: {
      message: '主体错误',
      name: 'Error',
      stack: '...',
    },
    stack: '...',
  },
  stack: '...',
};
```

可以看到，主体代码抛出错误不会导致资源释放的代码不执行，资源b释放过程抛出错误也不会导致资源a得不到释放。

另外，错误会按照抛出的顺序使用`suppressed`串联起来（a => b => main），我们定义的错误可以通过`e[0或多个.suppressed].error`获得，最后一个错误通过`e[0或多个.suppressed].suppressed`获得。

## await using声明

有时候，资源释放是异步的，这就需要使用`await using`来声明变量了，写法如下：

```javascript
await using file = doSomething();
```

`await`放在赋值操作左边？没错，第一次见这样的写法吧。它表明资源的释放是异步的，离开作用域时会调用`await file[Symbol.asyncDispose]()`或者`await file[Symbol.dispose]()`。

注意，上面代码是否使用`await using`声明变量与`doSomething`是否异步函数没有任何关系。如果`doSomething`是异步函数，上面代码可以写成：

```javascript
await using file = await doSomething();
```

await using的实现可以用下面的代码表示：

```javascript
{
  const $$try = { stack: [], error: undefined, hasError: false };
  try {
    ... // (1)

    const x = expr1;
    if (x !== null && x !== undefined) {
      let $$dispose = x[Symbol.asyncDispose];
      if (typeof $$dispose !== "function") {
        $$dispose = x[Symbol.dispose];
      }
      if (typeof $$dispose !== "function") {
        throw new TypeError();
      }
      $$try.stack.push({ value: x, dispose: $$dispose });
    }

    const y = expr2;
    if (y !== null && y !== undefined) {
      let $$dispose = y[Symbol.asyncDispose];
      if (typeof $$dispose !== "function") {
        $$dispose = y[Symbol.dispose];
      }
      if (typeof $$dispose !== "function") {
        throw new TypeError();
      }
      $$try.stack.push({ value: y, dispose: $$dispose });
    }

    ... // (2)
  }
  catch ($$error) {
    $$try.error = $$error;
    $$try.hasError = true;
  }
  finally {
    while ($$try.stack.length) {
      const { value: $$expr, dispose: $$dispose } = $$try.stack.pop();
      try {
        await $$dispose.call($$expr);
      }
      catch ($$error) {
        $$try.error = $$try.hasError ? new SuppressedError($$error, $$try.error) : $$error;
        $$try.hasError = true;
      }
    }
    if ($$try.hasError) {
      throw $$try.error;
    }
  }
}
```

可以看到，await using和using的实现很像，但也有一些差异。

### 不一定要有Symbol.asyncDispose

与using类似，await using声明的对象也有对应的方法用于资源释放：`[Symbol.asyncDispose]()`。如果这个方法找不到，会以`[Symbol.dispose]()`兜底。如果`[Symbol.dispose]()`也没有，则抛出`TypeError`。

所以，无论是使用using还是await using，都定义`[Symbol.dispose]()`准没错。不过，对于await using来说，使用`[Symbol.asyncDispose]()`语义上更准确。

## DisposableStack和AsyncDisposableStack

标准新增两个全局变量`DisposableStack`和`AsyncDisposableStack`来统一管理资源的释放。

使用方式：

```javascript
function doSomething() {
  using stack = new DisposableStack();
  // stack是否已释放
  stack.disposed;
  // 相当于调用stack[Symbol.dispose]()
  stack.dispose();
  // 可以理解为数组的push方法
  const a = stack.use(funcA());
  const b = stack.use(funcB());
  // 如果不是标准的可释放资源（有Symbol.dispose方法），可以自定义dispose方法
  stack.adopt(funcC, () => {
    // dispose逻辑
  });
  // 往栈顶加入其他dispose逻辑，在stack的资源释放之前执行
  stack.defer(() => {
    // dispose逻辑
  });
  // 将stack里的资源移动到新的stack
  const newStack = stack.move();
}
```

`AsyncDisposableStack`是`DisposableStack`的异步版本。

稍微提一下，使用`DisposableStack`时error的结构跟前面的不一样。

```javascript
function run() {
  function doSomething() {
    using stack = new DisposableStack();
    const a = stack.use(funcA());
    const b = stack.use(funcB());
    throw new Error('主体错误');
    // b[Symbol.dispose]() throw new Error('b错误')
    // a[Symbol.dispose]() throw new Error('a错误')
  }
  
  try {
    doSomething();
  } catch (e) {
    console.error(e);
  }
}
```

这里`e`的结构是：

```javascript
const e = {
  message: 'An error was suppressed during disposal.',
  name: 'SuppressedError',
  error: {
    message: '',
    name: 'SuppressedError',
    error: {
      message: 'a错误',
      name: 'Error',
      stack: '...',
    },
    suppressed: {
      message: 'b错误',
      name: 'Error',
      stack: '...',
    },
    stack: '...',
  },
  suppressed: {
    message: '主体错误',
    name: 'Error',
    stack: '...',
  },
  stack: '...',
};
```

也就是说代码主体抛出的错误放在`e.suppressed`，资源释放抛出的错误都放在`e.error`里，似乎把`DisposableStack`管理的资源抛出的错误作为一个整体了。

## 如何使用新特性

### VSCode

目前为止，最新版的VSCode内置的ts版本还没达到5.2.0-beta，所以使用新特性会提示错误。
![image.png](/assets/img/blogs/cea66129-a29e-4336-9ab6-fe152958d8b8.png)
要想更改VSCode使用的ts版本，有两个便捷的方法。

第一个，如果本地安装了typescript 5.2 beta版本，可以将鼠标悬浮到状态栏`TypeScript`的位置，然后点击`Select Version`，或者`Cmd+Shift+P`快捷键唤起搜索框然后搜索`TypeScript: Select TypeScript Version`，选择使用workspace版本。
![image.png](/assets/img/blogs/eeb425e2-0268-4ffa-b908-ccdf5d9dd804.png)
![image.png](/assets/img/blogs/14d1cc60-d38c-4635-b704-cbe0c9e31de6.png)
第二个，在User Settings里指定`typescript.tsdk`，可以使用本地或者全局安装的ts版本。

```javascript
{
  "typescript.tsdk": "/usr/local/lib/node_modules/typescript/lib"
}
```

## tsc编译

要想tsc编译出来的js代码能使用新特性，需要修改`tsconfig.json`，`target`需要是`es2022`或以下，`lib`需要包含`esnext`或者`esnext.disposable`。

```json
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["es2022", "esnext.disposable", "dom"]
  }
}
```

另外，还需要对`Symbol.dispose`等进行polyfill，具体方式是引入下面的js：

```javascript
import "core-js/modules/esnext.symbol.dispose.js";
import "core-js/modules/esnext.symbol.async-dispose.js";
import "core-js/modules/esnext.disposable-stack.constructor.js";
```

## 参考资料

1.  <https://devblogs.microsoft.com/typescript/announcing-typescript-5-2-beta/#using-declarations-and-explicit-resource-management>
2.  <https://github.com/tc39/proposal-explicit-resource-management>
3.  <https://code.visualstudio.com/docs/typescript/typescript-compiling#_using-newer-typescript-versions>
4.  <https://github.com/mizchi/play-ts-using>
5.  <https://github.com/microsoft/TypeScript/pull/54505>
