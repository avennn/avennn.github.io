---
title: Typescript系列：索引访问类型
date: 2023-06-19 18:05:39 +0800
categories: [前端]
tags: [ts]
image:
  path: /assets/img/blogs/adaa1c97-aaa6-41c9-8561-40895eefbb0d.png
---

假设我们有一个用户管理系统，用户的信息通过以下格式存储：

```typescript
interface User {
  name: string;
  phone: number;
  address: {
    country: string;
    province: string;
    city: string;
    postalCode: number;
  }
}
```

这时，我们想获取用户address的类型，最直接的办法是将`address`抽取为单独的类型。

```typescript
interface Address {
  country: string;
  province: string;
  city: string;
  postalCode: number;
}

interface User {
  name: string;
  phone: number;
  address: Address;
}
```

这段代码如果是我们自己业务可控的当然没问题，但如果它来源于第三方，我们没法直接修改代码怎么办呢？

这时候我们可以借助ts的`索引访问类型（Indexed Access Types）`来查找属性值的类型。

索引访问类型形如`T[P]`，有点类似js对象的属性访问。需要注意的是这里的`P`是类型而不是值，否则会报错。

```typescript
const address = "address";

// 报错
// 'address' refers to a value, but is being used as a type here. Did you mean 'typeof address'?
type Address = User[address];

// ok，'address'是User类型的property，是一个字面量类型
type Address = User['address'];
```

以上通过特定的字面量属性获取类型是索引访问类型的最基本用法，下面介绍一些高级用法。

## 联合类型作为索引访问

可以使用联合类型作为索引，获取多个属性值的联合类型。比如：

```typescript
interface User {
  name: string;
  phone: number;
  address: {
    country: string;
    province: string;
    city: string;
    postalCode: number;
  }
}


type NameOrPhone = 'name' | 'phone';
type Username1 = User[NameOrPhone]; // string | number


type Username2 = User['name' | 'phone']; // string | number
```

结合`keyof`操作符，可以获取对象所有属性的联合类型。

```typescript
type Username = User[keyof User];
// 等价于
type Username = string | number | {
  country: string;
  province: string;
  city: string;
  postalCode: number;
}
```

## 深度访问

还是上面User的例子，不同的系统设计，`address.postalCode`可能是number也有可能是string类型。如果我们想获取它的类型怎么办呢？类似js对象的属性访问，索引访问类型也能一层一层的深度访问。

```typescript
interface User {
  name: string;
  phone: number;
  address: {
    country: string;
    province: string;
    city: string;
    postalCode: number;
  }
}

type Address = User['address']['postalCode']; // number
```

结合后面介绍的`T[number]`，可以获取数组子项里的属性类型。

```typescript
type Users = User[];
type Address = Users[number]['address']['postalCode']; // number
```

## T\['length']

对于`type StringArr = string[]`这样一个数组类型，可以理解为以下的对象类型：

```typescript
type StringArr = {
  [index: number]: string;
  length: number;
}
```

对于`type Tuple = [string, number]`这样一个元组类型，可以理解为以下的对象类型：

```typescript
type TupleObj = {
  length: 2;
  0: string;
	1: number;
}
```

通过`T['length']`可以获取数组或者元组的长度的类型，但需要注意的是，数组得到的是`number`类型，元组得到的是一个数字的字面量类型。

```typescript
type StringArr = string[];
type Tuple = [string, number, 'foo'];

type ArrLen = StringArr['length']; // number
type TupleLen = Tuple['length'];   // 3
```

元组`T['length']`得到数字字面量类型这个特性很有用，ts类型体操里凡是涉及数值计算都需要用到它，比如[Length of String](https://github.com/type-challenges/type-challenges/blob/main/questions/00298-medium-length-of-string/README.md)。

另外，由于数组和元组`T['length']`得出的类型不同，我们可以根据这个特性区分类型是数组还是元组。

```typescript
type StringArr = string[];
type Tuple = [string, number, 'foo'];

type isTuple<T extends any[]> = number extends T['length'] ? false : true;

type T1 = isTuple<StringArr>;
type T2 = isTuple<Tuple>;
```

但是，对于有rest元素的元组，这个判断是不准确的。这个问题我也在github上发起了相关[讨论](https://github.com/type-challenges/type-challenges/issues/28048)。

```typescript
type StringNumberBooleans = [string, number, ...boolean[]];
type StringBooleansNumber = [string, ...boolean[], number];
type BooleansStringNumber = [...boolean[], string, number];

// 实际上StringNumberBooleans等都是元组，但判断有误
type T1 = isTuple<StringNumberBooleans>; // false
type T2 = isTuple<StringNumberBooleans>; // false
type T3 = isTuple<StringNumberBooleans>; // false
```

## T\[string]和T\[number]

索引访问不一定要使用明确的字面量类型，它还允许使用`T[string]`或`T[number]`这样的特殊形式。

对于对象类型来说，如果定义了index签名，可以通过`T[string]`获取属性值的所有类型的联合类型。

```typescript
interface User {
  [index: string]: string | number | boolean;
  name: string;
  phone: number;
}

type UserValueType = User[string]; // string | number | boolean
```

但这种写法不是很常用。

比较常见的是`T[number]`在数组和元组上的应用。

数组可以通过`T[number]`获取子项的类型，但要注意区分以下几种场景的细微差异：

```typescript
type EmptyArr = []; // 实际是元组
type StringArr = string[];
type AnyArr = any[];
type StringOrNumberArr = (string | number)[];

type T1 = EmptyArr[number];  // never
type T2 = StringArr[number]; // string
type T3 = AnyArr[number];    // any
type T4 = StringOrNumberArr[number]; // string | number
```

> `type EmptyArr = []`实际上是元组。

通过`T[number]`可以将元组转成联合类型。

```typescript
type Tuple = [string, number];

type TupleObj = {
  length: 2;
  0: string;
	1: number;
}

type T1 = Tuple[number];   // string | number
type T2 = TupleObj[0 | 1]; // string | number
```

这项特性在一些场景下十分有用，比如ts类型体操中的[Tuple to Union](https://github.com/type-challenges/type-challenges/blob/main/questions/00010-medium-tuple-to-union/README.md)以及下面介绍的与`typeof`操作符结合使用的真实场景。

另外值得一提的是，数组和元组都可以通过`T[0]`这种形式获取某一项元素的类型。

```typescript
type EmptyArr = [];
type StringArr = string[];
type Tuple = [string, number, 'foo'];

type T1 = EmptyArr[0]; // Tuple type '[]' of length '0' has no element at index '0'.
type T2 = StringArr[0]; // string
type T3 = Tuple[0]; // string
type T4 = Tuple[1]; // number
type T5 = Tuple[2]; // "foo"
```

## T\[number] + typeof

假设有下面一段代码：

```typescript
const platforms = ['pc', 'ios', 'android'];

function platformAdapter(p: string) {
  console.log(p);
}

platformAdapter('unknow-platform');
```

我们在做一个页面，需要适配PC端、ios、android这3个平台，所以定义了一个叫`platformAdapter`的适配器方法。我们希望限制`platformAdapter`的入参`p`为指定的3个平台之一，换句话说，`p`的类型为`'pc' | 'ios' | 'andriod'`，该怎么办呢？

一种办法是定义一个`Platform`的联合类型作为约束：

```typescript
const platforms = ['pc', 'ios', 'android'];

type Platform = 'pc' | 'ios' | 'andriod';

function platformAdapter(p: Platform) {
  console.log(p);
}

// Argument of type '"unknow-platform"' is not assignable to parameter of type 'Platform'.
platformAdapter('unknow-platform');
```

但这样在代码书写上不简洁，因为`const platforms`和`type Platform`用了相同的一些字段。而且，如果以后要新增平台，比如华为的HarmonyOS，需要同时修改两处代码，容易出错。

更好的办法是结合`T[number] `+ `typeof`操作符 + `as const`从js常量中推断出联合类型。

```typescript
const platforms = ['pc', 'ios', 'android'] as const;

type Platform = typeof platforms[number];

function platformAdapter(p: Platform) {
  console.log(p);
}

// Argument of type '"unknow-platform"' is not assignable to parameter of type '"pc" | "ios" | "android"'.
platformAdapter('unknow-platform');
```

这里推断的过程为：

1.  const断言保证`platforms`推断出的是readonly的字面量元组；
2.  typeof操作符获取类型；
3.  `T[number]`将元组转成联合类型`'pc' | 'ios' | 'andriod'`。

## 总结

1.  索引访问类型可以帮组我们查找属性的类型；
2.  可以使用联合类型作为索引访问；
3.  可以多层深度访问；
4.  数组和元组`T['length']`得到的类型的不同，这在类型体操里非常有用；
5.  `T[number]`可以将元组转成联合类型，结合typeof操作符使用，在一些业务场景下很有用。

## 参考资料

1.  <https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html>
2.  <https://www.allthingstypescript.dev/p/indexed-access-types-in-typescript>
3.  <https://yayujs.com/handbook/IndexedAccessTypes.html#%E7%B4%A2%E5%BC%95%E8%AE%BF%E9%97%AE%E7%B1%BB%E5%9E%8B-indexed-access-types>
4.  <https://www.typescriptlang.org/docs/handbook/2/objects.html#tuple-types>
