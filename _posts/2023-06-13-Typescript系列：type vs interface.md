---
title: Typescript系列：type vs interface
date: 2023-06-13 16:57:29 +0800
categories: [前端]
tags: [ts]
permalink: /posts/ef820f47-bb78-4d40-b580-44b2effa0777/
image:
  path: /assets/img/blogs/130898a1-500e-4d86-bb9e-930c849c16ca.png
---

相信很多使用ts开发过业务的同学经常将type和interface当作同一个东西替换使用。诚然，两者有一些共同的点，让它们在很多情况下可以替换使用而不会出问题，但实际上它们是完全不同的两个东西。

本文带大家了解type和interface的所有区别，让大家能够快速判断出到底用type还是interface。

## 概念不同

interface只是用来描述对象的形状，不能用来描述`string`等基础类型。而type是类型别名的意思，它相当于定义一个类型变量，可以声明任意类型。

```typescript
type EvenNumber = number;

// 报错
// An interface cannot extend a primitive type like 'string'; an interface can only extend named types and classes
// 'extends' clause of exported interface 'X' has or is using private name 'string'.
interface X extends string {

}
```

无法用interface定义的类型都使用type，比如基础类型、联合类型、元组等。

```typescript
type Name = string;

type PersonName = { name: string; };
type PersonAge = { age: number; };

// union
type PartialPerson = PersonName | PersonAge;

// tuple
type Data = [number, string];
```

实际上interface有一种很奇怪的写法可以实现元组：

```typescript
interface Data {
  0: number;
  1: string;
}

const foo: Data = [1, '2'];
```

## 写法不同

```typescript
interface Animal {
  name: string;
}

interface Bear extends Animal {
  honey: boolean;
}

const bear = getBear();
bear.name;
bear.honey;
```

```typescript
type Animal = {
  name: string;
}

type Bear = Animal & { 
  honey: boolean;
}

const bear = getBear();
bear.name;
bear.honey;
```

直观上的区别是一个用`interface`关键字，一个用`type`关键字。另外，添加新属性时interface用了`extends`从句，而type使用的是`&`交叉类型符号。

交叉类型可以连接多个interface，interface可以`extends`type，但不可以`extends`联合类型。

```typescript
interface A {
  name: string;
}

interface B {
  age: number;
}

type C = A & B;

type D = {
  name: string;
}

interface E extends D {
  age: number;
}

type F = A | B;

// 报错
// An interface can only extend an object type or intersection of object types with statically known members.
interface G extends F {}
```

## class implements

类可以实现interface或者type，但不可以实现联合类型。

```typescript
interface A {
  x: number;
}

class SomeClass1 implements A {
  x = 1;
  y = 2;
}

type B = {
  x: number;
}

class SomeClass2 implements B {
  x = 1;
  y = 2;
}

type C = { x: number } | { y: number };

// 报错
// A class can only implement an object type or intersection of object types with statically known members.
class SomeClass3 implements C {
  x = 1;
  y = 2;
}
```

## 声明合并

type包含了interface大部分的能力，但声明合并这个能力只有interface支持。

我们可以声明同名的interface，它们会自动合并。但type不可以声明同名的类型，就像ES6里我们不能用`let`或`const`重复声明变量。请看下面：

```typescript
interface Dog {
  name: 'dog';
}

interface Dog {
  run: () => void;
}

const dog: Dog = {
  name: 'dog',
  run: () => {
    console.log('dog run');
  }
};

// Duplicate identifier 'Fish'.
type Fish = {
  name: 'fish';
}

// Duplicate identifier 'Fish'.
type Fish = {
  swim: () => void;
}
```

## 冲突处理

interface生成一个打平的对象类型来检测属性的冲突，如果有冲突则报错。而type只是递归地合并属性，并不会在声明的时候报错，指定值的类型时则可能会报错，也可能不会报错。

```typescript
interface DateObj {
  value: string;
}

// 报错
// Interface 'DateObj1' incorrectly extends interface 'DateObj'.
//   Types of property 'value' are incompatible.
//     Type 'Date' is not assignable to type 'string'.
interface DateObj1 extends DateObj {
  value: Date;
}

type DateObj2 = {
  value: string;
} & {
  value: Date;
}

// 声明值的类型时报错
// Type 'string' is not assignable to type 'string & Date'.
//   Type 'string' is not assignable to type 'Date'.
let foo: DateObj2 = { value: '' };

type Person = {
  getPermission: (id: string) => string;
};

type Staff = Person & {
  getPermission: (id: string[]) => string[];
};

// 不会报错
const AdminStaff: Staff = {
  getPermission: (id: string | string[]) =>{
    return (typeof id === 'string'?  'admin' : ['admin']) as string[] & string;
  }
}
```

type声明对象的交叉类型有时会产出`never`，有的时候不会，比如前面的`DateObj2`就没有产出`never`。

对象类型的交叉类型`T1 & T2 & ... & Tn`要产出`never`，需要满足以下几个条件：

*   两个或多个`Tx`类型有相同名字的属性；
*   至少有一组同名的属性，某个类型比如`T1`的这个属性是字面量类型且所有`Tx`类型的这个属性都不是`never`；
*   至少一个属性交叉之后的结果是`never`。

比较难理解的是第二点，请看下面例子：

```typescript
type A = { kind: 'a', foo: string };
type B = { kind: 'b', foo: number };
type C = { kind: 'c', foo: number };
type D = { kind: string, foo: string };
type E = { kind: number, foo: string };
type F = { kind: never, foo: string };

type AB = A & B; // never
type BC = B & C; // never
type AD = A & D; // A & D，没有冲突
type DE = D & E; // D & E，属性没有字面量类型
type AE = A & E; // never，A的属性kind是字面量类型
type AF = A & F; // A & F，F的属性kind是never类型
```

交叉类型最终产不产出`never`有什么影响吗？

看起来`never`和`string & number`是同一个意思，但两者在一些情况下表现并不一样，具体可以看[这里](https://github.com/microsoft/TypeScript/pull/31838)，本文不再过多延伸。

## index签名

interface默认是没有index签名的，而type有。什么意思呢？

首先解释下什么是index签名。

对于对象或者数组，我们可以通过index签名描述所有value的类型，形式如下：

```typescript
interface IStringArray {
  [index: number]: string;
}

interface IStringObject {
  [index: string]: string;
}

type TStringArray = {
  [index: number]: string;
}

type TStringObject = {
  [index: string]: string;
}
```

`index`可以换成任意字面量如`K`、`P`等。

然后，看下面的例子：

```typescript
interface Animal {
  name: string;
}

function log(obj: Record<string, unknown>) {
  console.log(obj);
}

const dog: Animal = { name: 'dog' };

// 报错
// Argument of type 'Animal' is not assignable to parameter of type 'Record<string, unknown>'.
//   Index signature for type 'string' is missing in type 'Animal'.
log(dog);
```

一种解决办法是给`interface Animal`增加index签名：

```typescript
interface Animal {
  [index: string]: unknown;
  name: string;
}
```

另一种办法是改成type写法：

```typescript
type Animal = {
  name: string;
}
```

个人建议用后面这种。

## 是否支持映射类型

interface是不支持映射类型写法的，而type支持。

以下写法都是不允许的：

```typescript
interface X {
  [P in 'A' | 'B']: string;
}

interface StringToBoolean<T extends Record<string, string>> {
  [P in keyof T]: boolean;
}
```

改成type就没问题：

```typescript
type X = {
  [P in 'A' | 'B']: string;
}

type StringToBoolean<T extends Record<string, string>> = {
  [P in keyof T]: boolean;
}
```

## 总结

在声明对象类型时type和interface经常可以替换使用，但它们实际是完全不同的两个概念。

使用interface的场景：

1.  声明对象类型时，由于interface更加严格，所以尽量使用interface；
2.  需要合并声明。

使用type的场景：

1.  type几乎涵盖interface的所有能力，不能使用interface声明的类型都使用type，比如基础类型、联合类型、元组等；
2.  可以使用type避免属性冲突；
3.  需要index签名时使用type更便捷；
4.  需要处理映射类型。

## 参考资料

1.  <https://www.typescriptlang.org/docs/handbook/intro.html>
2.  <https://github.com/microsoft/TypeScript/wiki/Performance#preferring-interfaces-over-intersections>
3.  <https://github.com/microsoft/TypeScript/pull/36696>
4.  <https://github.com/microsoft/TypeScript/pull/31838>
5.  <https://blog.bitsrc.io/type-vs-interface-in-typescript-cf3c00bc04ae>
