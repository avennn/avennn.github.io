---
title: Typescript系列：类型断言
date: 2023-06-06 14:03:58 +0800
categories: [前端]
tags: [ts]
---

![typescript.png](/assets/img/blogs/3ad7d25d-63b5-4e21-9323-aee6f64e57fd.png)

## 语法

```typescript
值 as 类型
```

或者

```typescript
<类型>值
```

具体如：

```typescript
interface Foo {
  a: number;
  b: string;
}

const foo = {} as Foo;
// 或者
// const foo = <Foo>{};
foo.a = 1;
foo.b = 'hello';
```

`<Foo>`这种写法跟jsx语法有冲突，写在tsx文件里会报错。另外它跟ts泛型写法类似，容易混淆。所以建议都用`as`写法。

## 概念

有时候ts对类型的推断并不符合我们的预期，而我们又明确知道类型是什么，这时我们可以使用类型断言手动指定值的类型。

举个例子，假设有这样一段html：

```html
<body>
  <canvas id="my-canvas"></canvas>
</body>
```

我们想获取该canvas的2d上下文：

```typescript
const canvasEle = document.getElementById('my-canvas');
const context = canvasEle.getContext('2d');
```

这时ts会报错：
![image.png](/assets/img/blogs/597f5b37-f5a7-4c1c-9335-0c8d7c82d422.png)
但我们可以确定`document.getElementById('my-canvas')`能拿到一个canvas元素，所以我们可以通过`as HTMLCanvasElement`断言它是一个canvas元素来消除ts错误。

```typescript
const canvasEle = document.getElementById('my-canvas') as HTMLCanvasElement;
const context = canvasEle.getContext('2d'); // 现在不会报ts错误
```

## 类型断言的限制

类型断言并非可以随意使用，下面的断言就会报错：
![image.png](/assets/img/blogs/22bd40f4-e945-472a-b25b-f27daeded9be.png)
将string类型断言成number类型，这明显是不合理的，所以ts不允许这样的情况。

S类型要想断言成T类型，S和T需要互相兼容。可以简单理解为S是T的子类型或者T是S的子类型，但有例外：

```typescript
const foo = 1 as 2; // 1不是2的子类型，2不是1的子类型，但断言成功
```

## 双重断言

上文说过，要想断言成功，值的类型需要和断言的类型兼容。而`any`和`unknown`与其他类型都兼容，所以可以通过下面的双重断言来避免断言错误：

```typescript
const foo = 'aaa' as unknown as number;
```

## 类型断言 vs 类型转换

类型断言是ts编译时的概念，它不会影响js最终的运行结果，所以我们不能把它作为类型转换使用。

```typescript
function toNumber(input: unknown): number {
  return input as number;
}

const foo = toNumber('123');
```

`foo`的ts类型是`number`，但它的js类型是`string`。真的要转`number`，应该这么写：

```typescript
function toNumber(input: unknown): number {
  return Number(input);
}
```

## 慎用类型断言

考虑下面这段代码：

```typescript
interface Foo {
  a: number;
  b: string;
}

const foo = {};

foo.a = 1;
foo.b = 'hello';
// Property 'a' does not exist on type '{}'.
// Property 'b' does not exist on type '{}'.
```

类似的情况大家在日常中经常接触，ts会报错。解决办法之一是将`{}`断言成`Foo`：

```typescript
const foo = {} as Foo;

foo.a = 1;
foo.b = 'hello';
```

但这样子会丢失ts发现错误的能力，假如我们给`foo.a`赋值之前就使用它：

```typescript
const foo = {} as Foo;
const total = foo.a + 2; // NaN
```

得到的`total`并不符合我们预期，而ts并没有任何提示。

所以，能不使用类型断言我们尽量不要使用。

当你想用类型断言的时候，可以先看看能否换成类型声明。

### 类型声明

请看下面代码：

```typescript
interface Animal {
  name: string;
}
interface Dog {
  name: string;
  run(): void;
}

const animal: Animal = {
  name: 'aaa'
};
const dog: Dog = {
  name: 'bbb',
  run() {
    console.log('dog run');
  }
};

// 类型声明
const foo: Dog = animal; // Property 'run' is missing in type 'Animal' but required in type 'Dog'.
const bar: Animal = dog; // ok
// 类型断言
const foz = animal as Dog; // ok
const baz = dog as Animal; // ok
```

类型声明比类型断言严格，父类型赋值给子类型会报错，而类型断言只要类型兼容即可。除非你真的想将`Animal`类型赋值给`Dog`类型，否则应该用类型声明，如上面的`bar`的声明，这样更优雅。

## const断言

形如`值 as const`或`<const>值`。const断言有以下几个作用：

1.  字面量类型不会扩宽，如下面的`x`类型是`"hello"`而不是`string`;
2.  数组字面量变成只读元组；
3.  对象字面量属性变成只读。

```typescript
// Type '"hello"'
let x = "hello" as const;
// Type 'readonly [10, 20]'
let y = [10, 20] as const;
// Type '{ readonly text: "hello" }'
let z = { text: "hello" } as const;
```

const断言有什么用呢？

看下面的例子：

```typescript
function sum(a: number, b: number) {
  return a + b;
}

const arr = [3, 4];

console.log(sum(...arr));
// A spread argument must either have a tuple type or be passed to a rest parameter.
```

ts会报错，spread传入实参需要是元组或者接收rest形参。原因在于如果arr不是元组，在sum调用之前arr可能被改变，比如下面调用`splice`方法：

```typescript
const arr = [3, 4];
arr.splice(0, 1);
console.log(sum(...arr));
```

这样，`sum`方法只能接收到一个参数，计算就会出错。

最简单的解决办法是，使用const断言将`arr`转成元组类型：

```typescript
function sum(a: number, b: number) {
  return a + b;
}

const arr = [3, 4] as const;

console.log(sum(...arr));
```

另外一种使用场景是，禁止修改对象。比如下面代码，导出一个常量`Colors`，别的模块想修改它的属性时ts会报错。当然，这只是编译层面上的一种报警而已。

```typescript
export const Colors = {
  red: 'RED',
  green: 'GREEN',
  blue: 'BLUE',
} as const;

Colors.red = 'PINK';
// Cannot assign to 'red' because it is a read-only property.
```

值得注意的是，const常量在一些情况下的表现会让人感到意外。

1.  复杂的表达式；

```typescript
let a = (Math.random() < 0.5 ? 0 : 1) as const; // error
let b = (60 * 60 * 1000) as const; // error

let c = Math.random() < 0.5 ? (0 as const) : (1 as const); // ok
let d = 3_600_000 as const; // ok
```

2.  不会马上将对象完全转成不可变。

```typescript
let arr = [1, 2, 3, 4];
let foo = {
  name: 'foo',
  contents: arr,
  // 注意区分：
  // contents: [1, 2, 3, 4],
} as const;
foo.name = 'bar'; // error
foo.contents = []; // error
foo.contents.push(5); // ok
```

## 区分映射类型中key重映射的as从句

映射类型中key的重映射可能会用到跟类型断言一样的`as`关键字，但它不属于类型断言，这里简单介绍说明一下。

映射类型中key的重映射形式如下：

```typescript
type MappedTypeWithNewKeys<T> = {
    [K in keyof T as NewKeyType]: T[K];
}
```

具体应用：

1.  结合模板字面量类型将`key`转成`getKey`。

```typescript
interface Person {
  name: string;
  age: number;
  location: string;
}

type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
 
type LazyPerson = Getters<Person>;
```

![image.png](/assets/img/blogs/756fef08-3a8a-4fb4-855b-07f1d6b022fa.png)

2.  类型体操PickByType，类似于实现ts内置的Pick类型。

```typescript
type PickByType<T, U> = { 
  [P in keyof T as T[P] extends U ? P : never]: T[P];
}
```

## 总结

1.  当我们比ts更清楚值的类型时，可以通过类型断言手动指定；
2.  类型断言有两种写法，建议统一使用`as`关键字；
3.  类型不兼容时类型断言会报错，可以使用双重断言解决；
4.  类型断言是编译时概念，不等同于运行时的类型转换；
5.  尽量少用类型断言，因为它可能隐藏掉代码中的坏味道；
6.  const断言是一种特殊的类型断言，某些场景下比较有用；
7.  映射类型中key的重映射中也用到了`as`关键字，但不属于类型断言，注意区分。

## 参考资料

1.  <https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions>
2.  <https://basarat.gitbook.io/typescript/type-system/type-assertion>
3.  <https://ts.xcatliu.com/basics/type-assertion.html>
4.  <https://github.com/type-challenges/type-challenges/issues/2768>
5.  <https://www.typescriptlang.org/docs/handbook/2/mapped-types.html>
6.  <https://stackoverflow.com/a/74691895/17840557>
7.  <https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions>
