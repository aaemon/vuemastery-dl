# activeEffect & ref

In this lesson we’ll continue to build out our reactivity code by fixing a small bug and then implementing reactive references, much like you might have seen in Vue 3\. The bottom of our current code from the last lesson looks like this:
```js
...
let product = reactive({ price: 5, quantity: 2 })
let total = 0

let effect = () => {
    total = product.price * product.quantity
}
effect()

console.log(total)

product.quantity = 3

console.log(total)
```
The problem arrives when we add code which GETs a property from our reactive object, like so:
```js
console.log('Updated quantity to = ' + product.quantity)
```
The issue here is that `track` and all of it’s function will get called, even if we’re not inside an `effect`. We only want to look up and record the effect if `get` is called inside the active effect.

## Solution: activeEffect

To solve this problem, we’ll first create an `activeEffect`, a global variable we’ll store the currently running effect in. We’ll then set this inside a new function called `effect`.
```js
let activeEffect = null // The active effect running
...
function effect(eff) {
    activeEffect = eff  // Set this as the activeEffect
    activeEffect()      // Run it
    activeEffect = null // Unset it
}

let product = reactive({ price: 5, quantity: 2 })
let total = 0

effect(() => {
    total = product.price * product.quantity
})

effect(() => {
    salePrice = product.price * 0.9
})

console.log(
    `Before updated total (should be 10) = ${total} salePrice (should be 4.5) = ${salePrice}`
)

product.quantity = 3

console.log(
    `After updated total (should be 15) = ${total} salePrice (should be 4.5) = ${salePrice}`
)

product.price = 10

console.log(
    `After updated total (should be 30) = ${total} salePrice (should be 9) = ${salePrice}`
)
```
Notice that we no longer need to call the `effect` manually. It’s getting called automatically inside our new `effect` function. Notice I’ve also added a second `effect`, because why not 😁. I’ve also updated our `console.log`s to look more like tests, so we can verify the proper output. You can try out all the code yourself by grabbing it [off github](https://github.com/Code-Pop/vue-3-reactivity).

So good so far, but there’s one more change we need to make, and that’s inside the `track` function. It needs to use our new `activeEffect`.
```js
function track(target, key) {
    if (activeEffect) { // <------ Check to see if we have an activeEffect
        let depsMap = targetMap.get(target)
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map()))
        }
        let dep = depsMap.get(key)
        if (!dep) {
            depsMap.set(key, (dep = new Set())) // Create a new Set
        }
        dep.add(activeEffect) // <----- Add activeEffect to dependency map
    }
}
```
Great, now if we run our code we properly get:
```
Before updated total (should be 10) = 10 salePrice (should be 4.5) = 4.5
After updated total (should be 15) = 15 salePrice (should be 4.5) = 4.5
After updated total (should be 30) = 30 salePrice (should be 9) = 9
```
If you want to walk through this code executing line by line, definitely check out the video.

## The Need for Ref

When I was coding up this challenge I realized that the way I was calculating total might make a little more sense if it used the `salePrice` rather than `price`, like so:
```js
effect(() => {
    total = salePrice * product.quantity
})
```
If we were creating a real store, we’d probably calculate the `total` based on the `salePrice`. However, this code wouldn’t work reactively. Specifically, when `product.price` is updated, it will reactively recalculate the `salePrice` with this effect:
```js
effect(() => {
    salePrice = product.price * 0.9
})
```
But since `salePrice` isn’t reactive, the effect with `total` won’t get recalculated. Our first effect above won’t get re-run. We need some way to make `salePrice` reactive, and it’d be nice if we didn’t have to wrap it in another reactive object. If you’re familiar with the Composition API, which I teach in the [Vue 3 Essentials Course](https://www.vuemastery.com/courses/vue-3-essentials/why-the-composition-api/), you might be thinking that I should use `ref` to create a Reactive Reference. Let’s do this:
```js
let product = reactive({ price: 5, quantity: 2 })
let salePrice = ref(0)
let total = 0
```
According to the Vue documentation, a reactive reference takes an inner value and returns a reactive and mutable `ref` object. The `ref` object has a single property `.value` that points to the inner value. So we’d need to change around our effects a little to use `.value`.
```js
effect(() => {
    salePrice.value = product.price * 0.9
})

effect(() => {
    total = salePrice.value * product.quantity
})
```
Our code should work now, properly updating the total when `salePrice` is updated. However, we still need to define `ref`. There’s two ways we could do it.

## 1\. **Defining Ref with Reactive**

First, we could simply use `reactive` as we’ve defined it:
```js
function ref(intialValue) {
    return reactive({ value: initialValue })
}
```
However, this isn’t how Vue 3 defines ref with primitives, so let’s implement it differently.

## **Understanding JavaScript Object Accessors**

In order to understand how Vue 3 defines `ref`, we first need to make sure we are familiar with object accessors. These are sometimes also known as JavaScript computed properties (not to be confused with Vue computed properties). Below you can see a simple example which uses Object Accessors:
```js
let user = {
    firstName: 'Gregg',
    lastName: 'Pollack',

    get fullName() {
        return `${this.firstName} ${this.lastName}`
    },

    set fullName(value) {
        [this.firstName, this.lastName] = value.split(' ')
    },
}

console.log(`Name is ${user.fullName}`)
user.fullName = 'Adam Jahr'
console.log(`Name is ${user.fullName}`)
```
The `get` and `set` lines are object accessors to **get** `fullName` and **set** `fullName` accordingly. This is plain JavaScript, and is not a feature of Vue.

## 2\. Defining Ref with Object Accessors

Using Object Accessors, along with our `track` and `trigger` actions, we can now define ref using:
```js
function ref(raw) {
    const r = {
        get value() {
            track(r, 'value')
            return raw
        },
        set value(newVal) {
            raw = newVal
            trigger(r, 'value')
        },
    }
    return r
}
```
That’s all there is to it. Now when we run the following code:
```js
...
function ref(raw) {
    const r = {
        get value() {
            track(r, 'value')
            return raw
        },
        set value(newVal) {
            raw = newVal
            trigger(r, 'value')
        },
    }
    return r
}

function effect(eff) {
    activeEffect = eff
    activeEffect()
    activeEffect = null
}

let product = reactive({ price: 5, quantity: 2 })
let salePrice = ref(0)
let total = 0

effect(() => {
    salePrice.value = product.price * 0.9
})

effect(() => {
    total = salePrice.value * product.quantity
})

console.log(
    `Before updated quantity total (should be 9) = ${total} salePrice (should be 4.5) = ${salePrice.value}`
)
product.quantity = 3
console.log(
    `After updated quantity total (should be 13.5) = ${total} salePrice (should be 4.5) = ${salePrice.value}`
)
product.price = 10
console.log(
    `After updated price total (should be 27) = ${total} salePrice (should be 9) = ${salePrice.value}`
)
```
We get what we would expect:
```
Before updated total (should be 10) = 10 salePrice (should be 4.5) = 4.5
After updated total (should be 13.5) = 13.5 salePrice (should be 4.5) = 4.5
After updated total (should be 27) = 27 salePrice (should be 9) = 9
```
Our `salePrice` is now reactive and `total` gets updated when it changes!

## Coming Up

In our next lesson we’ll take our code a little deeper and look at how we might create a computed property like Vue 3 does.
