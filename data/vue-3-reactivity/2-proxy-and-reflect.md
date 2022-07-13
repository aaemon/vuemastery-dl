# Proxy and Reflect

In our last lesson we learned how Vue 3 keeps track of `effects` to re-run them when needed. However, we’re still having to manually call `track` and `trigger`. In this lesson we’ll learn how to use `Reflect` and `Proxy` to call them automatically.

## Solution: Hooking onto Get and Set

We need a way to hook (or listen for) the get and set methods on our reactive objects.

**GET property => We need to `track` the current `effect`**

**SET property => We need to `trigger` any tracked dependencies (effects) for this property**

The first step to understanding how to do this, is to understand how in Vue 3 with ES6 `Reflect` and `Proxy` we can intercept GET and SET calls. Previously in Vue 2 we did this with ES5 `Object.defineProperty`.

## Understanding ES6 Reflect

To print out an object property I can do this:
```js
let product = { price: 5, quantity: 2 }
console.log('quantity is ' + product.quantity)
// or
console.log('quantity is ' + product['quantity'])
```
However, I can also GET values on an object by using `Reflect`. `Reflect` allows you to get a property on an object. It’s just another way to do what I wrote above:
```js
console.log('quantity is ' + Reflect.get(product, 'quantity'))
```
Why use `reflect`? Good question! Because it has a feature we’ll need later, hold that thought.

## Understanding ES6 Proxy

A `Proxy` is a placeholder for another object, which by default delegates to the object. So if I run the following code:
```js
let product = { price: 5, quantity: 2 }
let proxiedProduct = new Proxy(product, {})
console.log(proxiedProduct.quantity)
```
The `proxiedProduct` delegates to the `product` which returns `2` as the quantity. Notice the second argument on `Proxy` with `{}`? This is called a `handler` and can be used to define custom behavior on the proxy object, like intercepting `get` and `set` calls. These interceptor methods are called `traps` and here’s how we would set a `get` trap on our `handler`:
```js
let product = { price: 5, quantity: 2 }

let proxiedProduct = new Proxy(product, {
    get() {
        console.log('Get was called')
        return 'Not the value'
    }
})

console.log(proxiedProduct.quantity)
```
In the console I’d see:

_Get was called_

_Not the value_

We’ve re-written what `get` returns when the property value is accessed. We should probably return the actual value, which we can do like:
```js
let product = { price: 5, quantity: 2 }

let proxiedProduct = new Proxy(product, {
    get(target, key) {  // <--- The target (our object) and key (the property name)
        console.log('Get was called with key = ' + key)
        return target[key]
    }
})

console.log(proxiedProduct.quantity)
```
Notice that the `get` function has two parameters, both the `target` which is our object (`product`) and the `key` we are trying to get, which in this case is `quantity`. Now we see:

_Get was called with key = quantity_

_2_

This is also where we can use Reflect and add an additional argument to it.
```js
let product = { price: 5, quantity: 2 }
let proxiedProduct = new Proxy(product, {
    get(target, key, receiver) {  // <--- notice the receiver
        console.log('Get was called with key = ' + key)
        return Reflect.get(target, key, receiver) // <----
    }
})
```
Notice our get has an additional parameter called `receiver` which we’re sending as an argument into `Reflect.get`. This ensures that the proper value of `this` is used when our object has inherited values / functions from another object. This is why we always use `Reflect` inside of a `Proxy`, so we can keep the original behavior we are customizing.

Now let’s add a setter method, there shouldn’t be any big surprises here:
```js
let product = { price: 5, quantity: 2 }

let proxiedProduct = new Proxy(product, {
    get(target, key, receiver) {
        console.log('Get was called with key = ' + key)
        return Reflect.get(target, key, receiver)
    }
    set(target, key, value, receiver) {
        console.log('Set was called with key = ' + key + ' and value = ' + value)
        return Reflect.set(target, key, value, receiver)
    }
})

proxiedProduct.quantity = 4
console.log(proxiedProduct.quantity)
```
Notice that `set` looks very similar to get except that it’s using `Reflect.set` which receives the `value` to set the `target` (product). Our output as expected is:

_Set was called with key = quantity and value = 4_

_Get was called with key = quantity_

_4_

There’s another way we can encapsulate this code, which is what you see in the Vue 3 source code. First, we’ll wrap this proxying code in a `reactive` function which returns the proxy, which should look familiar if you’ve played with the Vue 3 Composition API. Then we’ll declare our `handler` with it’s `traps` separately and send them into our proxy.
```js
function reactive(target) {
    const handler = {
    get(target, key, receiver) {
        console.log('Get was called with key = ' + key)
        return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
        console.log('Set was called with key = ' + key + ' and value = ' + value)
        return Reflect.set(target, key, value, receiver)
    }
    }
    return new Proxy(target, handler)
}

let product = reactive({ price: 5, quantity: 2 }) // <-- Returns a proxy object
product.quantity = 4
console.log(product.quantity)
```
This would return the same as above, but now we can easily create multiple reactive objects.

## Combining Proxy + Effect Storage

If we take the code we have for creating reactive objects, and remember:

**GET property => We need to `track` the current effect**

**SET property => We need to `trigger` any tracked dependencies (`effects`) for this property**

We can start to imagine where we need to call `track` and `trigger` with the code above:
```js
function reactive(target) {
    const handler = {
    get(target, key, receiver) {
        let result = Reflect.get(target, key, receiver)
            // Track
        return result
    },
    set(target, key, value, receiver) {
        let oldValue = target[key]
        let result = Reflect.set(target, key, value, receiver)
        if (result && oldValue != value) { // Only if the value changes
            // Trigger
        }
        return result
    }
    }
    return new Proxy(target, handler)
}
```
Now let’s put the two pieces of code together:
```js
const targetMap = new WeakMap() // targetMap stores the effects that each object should re-run when it's updated
function track(target, key) {
    // We need to make sure this effect is being tracked.
    let depsMap = targetMap.get(target) // Get the current depsMap for this target
    if (!depsMap) {
        // There is no map.
        targetMap.set(target, (depsMap = new Map())) // Create one
    }
    let dep = depsMap.get(key) // Get the current dependencies (effects) that need to be run when this is set
    if (!dep) {
        // There is no dependencies (effects)
        depsMap.set(key, (dep = new Set())) // Create a new Set
    }
    dep.add(effect) // Add effect to dependency map
}

function trigger(target, key) {
    const depsMap = targetMap.get(target) // Does this object have any properties that have dependencies (effects)
    if (!depsMap) {
        return
    }
    let dep = depsMap.get(key) // If there are dependencies (effects) associated with this
    if (dep) {
        dep.forEach(effect => {
            // run them all
            effect()
        })
    }
}

function reactive(target) {
    const handler = {
        get(target, key, receiver) {
            let result = Reflect.get(target, key, receiver)
            track(target, key) // If this reactive property (target) is GET inside then track the effect to rerun on SET
            return result
        },
        set(target, key, value, receiver) {
            let oldValue = target[key]
            let result = Reflect.set(target, key, value, receiver)
            if (result && oldValue != value) {
                trigger(target, key) // If this reactive property (target) has effects to rerun on SET, trigger them.
            }
            return result
        }
    }
    return new Proxy(target, handler)
}

let product = reactive({ price: 5, quantity: 2 })
let total = 0

let effect = () => {
    total = product.price * product.quantity
}
effect()

console.log('before updated quantity total = ' + total)
product.quantity = 3
console.log('after updated quantity total = ' + total)
```
Notice how we no longer need to call `trigger` and `track` because these are getting properly called inside our `get` and `set` methods. Running this code gives us:

_before updated quantity total = 10_

_after updated quantity total = 15_

Wow, we’ve come a long way! There’s only one bug to fix before this code is solid. Specifically, that we only want `track` to be called on a reactive object if it’s inside an `effect`. Right now `track` will be called whenever a reactive object property is `get`. We’ll polish this up in the next lesson.
