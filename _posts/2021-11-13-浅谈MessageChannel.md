---
title: 浅谈MessageChannel
date: 2021-11-13 00:10:00 +0800
categories: [前端]
tags: [js, 浏览器]
permalink: /posts/4f7ce684-4edd-4420-83c8-2cde61b4ff63/
image:
  path: /assets/img/blogs/17ba54f3-c47f-4c88-b6e5-677b5b476deb.png
---

> 阅读Vue和React两大前端框架的源码时都出现了MessageChannel的影子，但是自己却没不了解什么是MessageChannel，它有什么用。于是花了一些时间研究，并尝试把它解释清楚。

## 什么是MessageChannel

MessageChannel允许我们在不同的浏览上下文，比如window.open()打开的窗口或者iframe等之间建立通信管道，并通过两端的端口（`port1`和`port2`）发送消息。MessageChannel以`DOM Event`的形式发送消息，所以它属于异步的宏任务。

## 基本用法

```javascript
const { port1, port2 } = new MessageChannel();
port1.onmessage = function (event) {
  console.log('收到来自port2的消息：', event.data); // 收到来自port2的消息： pong
};
port2.onmessage = function (event) {
  console.log('收到来自port1的消息：', event.data); // 收到来自port1的消息： ping
  port2.postMessage('pong');
};
port1.postMessage('ping');
```

`addEventListener`的写法也可以。

```javascript
const { port1, port2 } = new MessageChannel();
port1.addEventListener('message', function (event) {
  console.log('收到来自port2的消息：', event.data); // 收到来自port2的消息： pong
});
port1.start();
port2.addEventListener('message', function (event) {
  console.log('收到来自port1的消息：', event.data); // 收到来自port1的消息： ping
  port2.postMessage('pong');
});
port2.start();
port1.postMessage('ping');
```

> 注意，`addEventListener`之后要手动调用`start()`方法消息才能流动，因为初始化的时候是暂停的。`onmessage`已经隐式调用了`start()`方法。

我们把port1和port2统一叫做`MessagePort`。

MessagePort还有两个方法：`close`和`onmessageerror`。

`close`方法能断开MessagePort的连接，之后两个断开之间将无法通信。建议通信结束后主动调用close方法以便资源回收。

消息不能反序列化时，会出现错误，这时可以用`onmessageerror`方法捕获。

## 使用场景

### EventEmitter

MessageChannel可以作为简单的EventEmitter做事件的订阅发布，实现不同脚本之间的通信。比如

```javascript
// a.js
export default function a(port) {
  port.postMessage({ from: 'a', message: 'ping' });
}

// b.js
export default function b(port) {
  port.onmessage = (e) => {
    console.log(e.data); // {from: 'a', message: 'ping'}
  };
}

// index.js
import a from './a.js';
import b from './b.js';

const { port1, port2 } = new MessageChannel();
b(port2);
a(port1);
```

### iframe

window与单个`iframe`或者多个`iframe`之间的通信可以使用MessageChannel，通过只暴露有限的能力从而保证安全性。另外，当iframe和服务端的通信要从原来的XHR改造成websocket，window与iframe原有的MessageChannel通信方式是不用改动的。

### Web Worker

一般来说，web worker跟主线程的通信方式是这样的：

```javascript
// worker1.js
self.onmessage = function (e) {
  console.log('receive a message from main window', e.data); // { command: 'connect' }
  if (e.data.command === 'connect') {
    self.postMessage({ message: 'connected' });
  }
};

// index.js
const worker1 = new Worker('worker1.js');
worker1.postMessage({ command: 'connect' });
worker1.onmessage = function (e) {
  console.log('receive a message from worker1', e.data); // { message: 'connected' }
};
```

此时如果增加一个web worker（`worker2`），想让`worker2`和`worker1`通信。比较直接的做法是将主线程作为桥梁，worker1和worker2的消息都通过主线程转发给对方。

另一个思路是利用MessageChannel实现两个worker的直接通信。web worker的`postMessage`方法能够接受一个由`Transferable Objects`组成的数组作为参数，而MessageChannel导出的MessagePort刚好是Transferable Objects。`postMessage`方法传入MessagePort之后，我们就可以在worker里获得它，并通过它向另一个MessagePort发消息。也因为MessagePort作为worker的Transferable Objects使用，所以它在主线程里再也监听不到消息了，具体原因可以深入了解下什么是[Transferable Objects](https://developer.mozilla.org/en-US/docs/Glossary/Transferable_objects)。下面这个示意图描述了这个实现的原理：

![image.png](/assets/img/blogs/4c6b34ca-8d6e-4117-9fc1-d6af358178cd.png)

具体代码实现：

```javascript
// worker1.js
let port1;
// 监听来自主线程的消息
self.onmessage = function (event) {
  switch (event.data.command) {
    case 'connect':
      // MessageChannel的port1
      port1 = event.ports[0];
      // 监听来自port2的消息
      port1.onmessage = function (event) {
        console.log('worker1收到来自worker2的消息: ', event.data); // pong
      };
      break;
    case 'forward':
      // 消息转发给port2
      port1.postMessage(event.data.message);
      break;
    default:
      console.log('worker1收到来自主线程的消息：', event.data);
  }
};

// worker2.js
let port2;
// 监听来自主线程的消息
self.onmessage = function (event) {
  switch (event.data.command) {
    case 'connect':
      // MessageChannel的port2
      port2 = event.ports[0];
      // 监听来自port1的消息
      port2.onmessage = function (event) {
        console.log('worker2收到来自worker1的消息: ', event.data); // ping
      };
      port2.postMessage('pong');
      break;
    case 'forward':
      // 消息转发给port1
      port2.postMessage(event.data.message);
      break;
    default:
      console.log('worker2收到来自主线程的消息：', event.data);
  }
};

// index.js
const { port1, port2 } = new MessageChannel();
const worker1 = new Worker('worker1.js');
const worker2 = new Worker('worker2.js');

port1.onmessage = function (e) {
  console.log('port1在主线程收到消息：', e.data); // 不会打印
};

// 向worker1发送connect的信息
worker1.postMessage(
  {
    command: 'connect',
  },
  [port1]
);

// 向worker2发送connect的信息
worker2.postMessage(
  {
    command: 'connect',
  },
  [port2]
);

// 向worker1发送forward的消息
worker1.postMessage({
  command: 'forward',
  message: 'ping',
});
```

### 序列化和反序列化

MessageChannel的消息在发送和接收的过程需要序列化和反序列化。利用这个特性，我们可以实现`深拷贝`。

```javascript
function deepClone(obj) {
  return new Promise((resolve, reject) => {
    try {
      const { port1, port2 } = new MessageChannel();

      port2.onmessage = function (e) {
        resolve(e.data);
      };
      port1.postMessage(obj);
    } catch (e) {
      reject(e);
    }
  });
}

const oldObj = { a: { b: 1 } };
deepClone(oldObj).then((newObj) => {
  console.log(oldObj === newObj); // false
  newObj.a.b = 2;
  console.log(oldObj.a.b); // 1
});
```

当消息包含`函数`、`Symbol`等不可序列化的值时，就会报无法克隆的DOM异常。

```javascript
deepClone({ fn: () => {} }).catch((e) => {
  console.log(e); // DOMException...could not be cloned
});
```

除了以上几种场景，MessageChannel还是在事件循环的应用上出现得比较多。

## Event Loop中的执行顺序

下面的例子，打印顺序会是怎样？

```typescript
setTimeout(() => {
    console.log('setTimeout')
}, 0)

const { port1, port2 } = new MessageChannel()
port2.onmessage = function () {
    console.log('MessageChannel')
}
port1.postMessage('ping')

requestAnimationFrame(() => {
    console.log('requestAnimationFrame')
})

Promise.resolve().then(() => {
    console.log('Promise')
})
```

答案是

```typescript
Promise
requestAnimationFrame
MessageChannel
setTimeout
```

前面说过，MessageChannel是以DOM Event的形式发送消息，所以它是一个宏任务，会在下一个事件循环的开头执行。

至于为什么MessageChannel回调的执行时机会比`setTimeout`早，这里简单解释一下，浏览器的宏任务队列其实是一个有序集合，这意味着队列里到期的事件不一定会按入队的顺序执行，因为DOM Event的优先级比计时器高，所以会出现上面的打印结果。

补充说明：

> 1.  requestAnimationFrame打印时机不稳定，因为不是每次事件循环都会触发重渲染，浏览器可能将多次渲染合成一次；
> 2.  在旧版本chrome上MessageChannel会先于setTimeout打印，在新版本chrome上则反过来，应该是chrome在某个版本上修改了宏任务优先级的实现。

## 在Vue中的使用

Vue的nextTick的实现经过了多次的调整。在Vue2.5以前，nextTick优先使用微任务Promise来实现。到了2.5版本，Vue引入MessageChannel，nextTick的实现优先使用`setImmediate`，平台不支持则使用`MessageChannel`，再不支持才使用`Promise`，最后用`setTimeout`兜底。

```javascript
if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  timerFunc = () => {
    setImmediate(nextTickHandler)
  }
} else if (typeof MessageChannel !== 'undefined' && (
  isNative(MessageChannel) ||
  MessageChannel.toString() === '[object MessageChannelConstructor]'
)) {
  const channel = new MessageChannel()
  const port = channel.port2
  channel.port1.onmessage = nextTickHandler
  timerFunc = () => {
    port.postMessage(1)
  }
} else
  if (typeof Promise !== 'undefined' && isNative(Promise)) {
    const p = Promise.resolve()
    timerFunc = () => {
      p.then(nextTickHandler)
    }
  } else {
    timerFunc = () => {
      setTimeout(nextTickHandler, 0)
    }
  }
```

不过到了2.6版本以后，nextTick又改回原来的Promise实现。虽然MessageChannel只存在了一个minor版本，但是我们从Vue的使用上知道它可以用来控制异步任务的执行时机。

## 在React中的使用

众所周知，React为了保证一帧内有足够的时间渲染ui，使用了`requestIdleCallback`这个API。但实际上，由于requestIdleCallback工作帧率低，只有`20FPS`，还有兼容问题，React并没有使用它，而是用`requestAnimationFrame`和`MessageChannel`进行polyfill。

```javascript
// SchedulerHostConfig.default.js
...
const performWorkUntilDeadline = () => {
  if (scheduledHostCallback !== null) {
    const currentTime = getCurrentTime();
    // Yield after `yieldInterval` ms, regardless of where we are in the vsync
    // cycle. This means there's always time remaining at the beginning of
    // the message event.
    deadline = currentTime + yieldInterval;
    const hasTimeRemaining = true;
    try {
      const hasMoreWork = scheduledHostCallback(
        hasTimeRemaining,
        currentTime,
      );
      if (!hasMoreWork) {
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      } else {
        // If there's more work, schedule the next message event at the end
        // of the preceding one.
        port.postMessage(null);
      }
    } catch (error) {
      // If a scheduler task throws, exit the current browser task so the
      // error can be observed.
      port.postMessage(null);
      throw error;
    }
  } else {
    isMessageLoopRunning = false;
  }
  // Yielding to the browser will give it a chance to paint, so we can
  // reset this.
  needsPaint = false;
};

const channel = new MessageChannel();
const port = channel.port2;
channel.port1.onmessage = performWorkUntilDeadline;
...
```

## 兼容性

主流浏览器都对MessageChannel支持良好。
![image.png](/assets/img/blogs/74ffe1e8-3ea1-4750-93e6-4c6d9166efdd.png)

## 参考资料

1.  <https://html.spec.whatwg.org/multipage/web-messaging.html#channel-messaging>
2.  <https://zhuanlan.zhihu.com/p/37589777>
3.  <https://stackoverflow.com/questions/14191394/web-workers-communication-using-messagechannel-html5>
4.  <https://html.spec.whatwg.org/multipage/structured-data.html>
5.  <https://developer.mozilla.org/en-US/docs/Glossary/Transferable_objects>
6.  <https://www.html5rocks.com/en/tutorials/workers/basics/>
7.  <https://www.ruanyifeng.com/blog/2018/07/web-worker.html>
8.  <https://juejin.cn/post/6844904196345430023>
9.  <https://github.com/vuejs/vue/blob/v2.5.0/src/core/util/env.js#L91-L119>
10. <https://github.com/facebook/react/blob/v17.0.2/packages/scheduler/src/forks/SchedulerHostConfig.default.js#L158-L245>
