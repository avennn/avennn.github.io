---
title: Typescript系列：协变、逆变、不变和双向协变
date: 2021-12-05 13:47:55 +0800
categories: [前端]
tags: [ts]
---

![typescript.png](/assets/img/blogs/a7824ddf-218e-40cf-883f-562eb85a40a0.png)

## 共识

如果类型T继承类型U，我们规定用以下形式表示：

> T ≤ U

T是子类型，U是父类型。
如果U类型赋值给T类型，我们表示如下：

> T: U

一般来说，子类型的变量赋值给父类型的变量是安全的，反之则不安全，Typescript很有可能报错。
定义`Animal`和`Dog`类型，后面的代码演示都以此为基础。

```typescript
class Animal {
  doAnimalThing() {
    console.log('do animal thing.')
  }
}
class Dog extends Animal {
  doDogThing() {
    console.log('do dog thing.')
  }
}
```

## 协变

**Covariance**
如果`T ≤ U`，那么`F<T> ≤ F<U>`也成立，这就叫**协变**。很容易理解吧。
这里协变主要讲函数的返回值类型的检查。

```typescript
type Co<V> = () => V;

// Co<Dog> ≤ Co<Animal>
const animalFn: Co<Animal> = () => {
  return new Animal();
}

const dogFn: Co<Dog> = () => {
  return new Dog();
}

let a: Co<Animal> = dogFn; // ok，dogFn返回Dog，Dog本身就是Animal
let b: Co<Dog> = animalFn; // error，animalFn返回Animal，Animal不一定是Dog，有可能不会doDogThing
```

可以看到，函数的返回值类型要协变才安全，否则ts可能会报错。

## 逆变

**Cotravariance**
跟协变相反，如果`T ≤ U`，那么`F<U> ≤ F<T>`成立，这就叫**逆变**。
这里逆变主要讲的是函数的参数类型的检查。

> 注意，是函数赋值时对参数的检查，并不是参数赋值时的检查。

当开启了`--strictFunctionTypes`或者`--strict`模式，ts才对函数参数类型进行逆变检查。

```typescript
type Cotra<V> = (input: V) => void;

// Cotra<Animal> ≤ Cotra<Dog>
const animalFn: Cotra<Animal> = (input) => {
  input.doAnimalThing();
}

const dogFn: Cotra<Dog> = (input) => {
  input.doDogThing();
}

let a: Cotra<Animal> = dogFn; // error，Animal没有doDogThing方法
let b: Cotra<Dog> = animalFn; // ok
```

这里可能有点难理解，但是细想一下，就会发现这是合理的。
方法a我们定义入参为一个Animal，但是赋值是dogFn，调用方法a时如果真的传入Animal，由于Animal没有doDogThing方法，一定会执行出错。所以这里ts会提示错误。
但反过来就没问题。方法b传入Dog，Dog继承Animal，是有doAnimalThing方法的。

## 不变

**Invariance**，不变是我自己翻译的。
如果`T ≤ U`，但是即不能得出`F<T> ≤ F<U>`，也不能得出`F<U> ≤ F<T>`，就叫**Invariance**。

```typescript
type In<V> = (input: V) => V;

const animalFn: In<Animal> = (input) => {
  input.doAnimalThing();
  return input;
}

const dogFn: In<Dog> = (input) => {
  input.doDogThing();
  return input;
}

let a: In<Animal> = dogFn; // error，参数类型逆变检查不通过
let b: In<Dog> = animalFn; // error，返回值类型协变检查不通过
let c: In<Animal> = animalFn; // ok
let d: In<Dog> = dogFn; // ok
```

可以看到，由于函数参数逆变检查和函数返回值协变检查，只有严格的同一类型的赋值才不会报ts错误。
思考一下，下面的类型赋值有问题吗？

```typescript
(input: Dog) => Animal: (input: Animal) => Dog
```

## 双向协变

**Bivariance**，双向协变是我自己翻译的。
前面讲到过，只有开启了`--strictFunctionTypes`或者`--strict`模式，ts才对函数参数类型进行逆变检查。默认情况下，ts对函数参数进行Bivariance检查，就是说既允许协变又允许逆变。

```typescript
type Bi<V> = (input: V) => void;

// Bi<Dog> ≤ Bi<Animal>, Bi<Animal> ≤ Bi<Dog>
const animalFn: Bi<Animal> = (input) => {
  input.doAnimalThing();
}

const dogFn: Bi<Dog> = (input) => {
  input.doDogThing();
}

let a: Bi<Animal> = dogFn; // ok
let b: Bi<Dog> = animalFn; // ok
```

为什么ts要允许双向协变？这样不是不安全吗？
的确，上面的例子中，方法a是不安全的。但是考虑到一些情况下，严格的函数参数逆变检查不合理，所以ts做了妥协。具体原因官方举了个[例子](https://github.com/Microsoft/TypeScript/wiki/FAQ#why-are-function-parameters-bivariant)，大家可以去看看。这里我简单解释一下。

```typescript
function checkIfAnimalsAreAwake(arr: Animal[]) { ... }
let myPets: Dog[] = [spot, fido];

checkIfAnimalsAreAwake(myPets);
```

上面的代码，`Dog[]`当作`Animal[]`传入`checkIfAnimalsAreAwake`方法显然是合理的，因为我们很自然地认为`Dog ≤ Animal`能推断出`Dog[] ≤ Animal[]`。但这个结论要有个必要条件：`(x: Dog) => number ≤ (x: Animal) => number`。可是按前面的逆变原理，这显然是不成立的。这就产生了矛盾。所以，ts的函数参数类型默认既允许协变又允许逆变。

## 参考资料

1.  <https://www.stephanboyer.com/post/132/what-are-covariance-and-contravariance>
2.  <https://github.com/Microsoft/TypeScript/wiki/FAQ#why-are-function-parameters-bivariant>
3.  <https://dmitripavlutin.com/typescript-covariance-contravariance/>
4.  <https://dev.to/codeoz/how-i-understand-covariance-contravariance-in-typescript-2766>
5.  <https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-6.html#strict-function-types>
6.  <https://www.py4u.net/discuss/1331538>
7.  <https://www.typescriptlang.org/tsconfig#strictFunctionTypes>
