---
title: Typescript系列：unknown vs any
date: 2021-12-05 17:52:31 +0800
categories: [前端]
tags: [ts]
image:
  path: /assets/img/blogs/1040dc28-1c7d-4183-aa81-0d38a64d8705.png
---

## 前言

ts有两种顶层类型：`any`和`unknown`，它们非常像，在日常使用中很难界定什么时候该用`any`，什么时候该用`unknown`。这篇文章就来捋一捋。

## any

任何类型都可以分配给`any`，它是ts类型检查的逃生舱，告诉tsc直接跳过类型检查。`any`违背了类型检查的初衷，一般不建议使用，尤其在有了`unknown`类型之后。

## unknown

Typescript3.0引入了`unknown`，可以理解为类型安全版本的`any`。同样地，任何类型都可以分配给`unknown`，但是`unknown`不可分配给除了`unknown`或`any`的其他类型，除非有类型断言或者类型收窄的处理。

## 对比

1.  任何类型可以分配给`any`和`unknown`，`any`可以分配给任何类型，`unknown`只能分配给`unknown`或者`any`。

```typescript
// 任何类型可以分配给any
function f01<T>(pAny: any, pNever: never, pT: T) {
  let x: any;
  x = 123;
  x = "hello";
  x = [1, 2, 3];
  x = new Error();
  x = x;
  x = pAny;
  x = pNever;
  x = pT;
}
// any可以分配给任何类型
function f02<T>(x: any) {
  let v1: any = x;
  let v2: unknown = x;
  let v3: object = x;
  let v4: string = x;
  let v5: string[] = x;
  let v6: {} = x;
  let v7: {} | null | undefined = x;
}
// 任何类型可以分配给unknown
function f21<T>(pAny: any, pNever: never, pT: T) {
  let x: unknown;
  x = 123;
  x = "hello";
  x = [1, 2, 3];
  x = new Error();
  x = x;
  x = pAny;
  x = pNever;
  x = pT;
}
// unknown只能分配给unknown或者any
function f22(x: unknown) {
  let v1: any = x;
  let v2: unknown = x;
  let v3: object = x; // Error
  let v4: string = x; // Error
  let v5: string[] = x; // Error
  let v6: {} = x; // Error
  let v7: {} | null | undefined = x; // Error
  let v8: string = x as string; // Ok，断言为string
}
function f23(x: unknown): string {
  if (typeof x === 'string') {
    return x; // Ok
  }
  return String(x);
}
```

2.  `any`与任何类型`T`的交叉类型为`any`，`unknown`与任何类型`T`的交叉类型为`T`，即

> any & T => any
> unknown & T => T

上面的结论不完全正确，要考虑优先级，`never ＞ any ＞ unknown`，所以 `any & never => never`，`unknown & never => never`，`unknown & any => any`

```typescript
type T00 = any & null; // any
type T01 = any & undefined; // any
type T02 = any & null & undefined; // never
type T03 = any & string; // any
type T04 = any & string[]; // any
type T05 = any & unknown; // any
type T06 = any & any; // any

type T10 = unknown & null; // null
type T11 = unknown & undefined; // undefined
type T12 = unknown & null & undefined; // null & undefined (which becomes never)
type T13 = unknown & string; // string
type T14 = unknown & string[]; // string[]
type T15 = unknown & unknown; // unknown
type T16 = unknown & any; // any
```

3.  `any`与任何类型`T`的联合类型为`any`，`unknown`与任何类型`T`的联合类型为`unknown`，即

> any | T => any
> unknown | T => unknown

`unknown`和`any`表现一致，但优先级上`any`比较高。

```typescript
type T00 = any | null; // any
type T01 = any | undefined; // any
type T02 = any | null | undefined; // any
type T03 = any | string; // any
type T04 = any | string[]; // any
type T05 = any | unknown; // any
type T07 = any | never; // any

type T10 = unknown | null; // unknown
type T11 = unknown | undefined; // unknown
type T12 = unknown | null | undefined; // unknown
type T13 = unknown | string; // unknown
type T14 = unknown | string[]; // unknown
type T16 = unknown | any; // any
type T17 = unknown | never; // unknown
```

4.  `any`类型可以属性访问、元素访问、函数调用，`unknown`在没有类型收窄时不可以

```typescript
function f10(x: any) {
  x.foo; // OK
  x[5]; // OK
  x(); // OK
  new x(); // OK
}
function f11(x: unknown) {
  x.foo; // Error
  x[5]; // Error
  x(); // Error
  new x(); // Error
}
```

5.  `any`可以使用任何操作符和运算符，`unknown`只能用相等判断

```typescript
function f10(x: any) {
  x == 5;
  x !== 10;
  x >= 0;
  x + 1;
  x * 2;
  -x;
  +x;
}
function f11(x: unknown) {
  x == 5;
  x !== 10;
  x >= 0; // Error
  x + 1; // Error
  x * 2; // Error
  -x; // Error
  +x; // Error
}
```

6.  `keyof`的不同

```typescript
type T00 = keyof any; // string | number | symbol
type T01 = keyof unknown; // never
```

7.  同态映射的不同

```typescript
type T10<T> = { [P in keyof T]: number };
type T11 = T10<any>; // { [x: string]: number }
type T12 = T10<unknown>; // {}
```

8.  函数返回的不同。函数返回值类型为`any`时，可以没有return语句，但是为`unknown`时要有。

```typescript
function f10(): any {} // OK
function f11(): unknown {} // Error
```

除了上面几种情况，`unknown`和`any`表现基本一样。

## 参考资料

1.  <https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html>
2.  <https://thesoftwaresimpleton.com/blog/2019/05/26/ts-bottom-type>
3.  <https://fullstackbb.com/typescript/typescript-unknown-as-top-type/>
