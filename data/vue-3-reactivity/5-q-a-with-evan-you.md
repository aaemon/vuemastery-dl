# Q & A with Evan You

After learning how reactivity was written in Vue 2 and then in Vue 3 I was left with a couple of questions. Luckily, I had an opportunity to sit down with Evan You, the author of Vue, and ask him in person.

Questions we cover include:

*   In Vue 2 Reactivity we used `depend` and `notify` for recording and playing back effects, and in Vue 3 we use `track` and `trigger`, why the change?
*   In Vue 2 Reactivity `Dep` is a class with subscribers, and in Vue 3 dep is simply a `Set`. Why the change?
*   How did you end up with the `effect` storage solution in Vue 3? i.e. `targetMap` and `depsMap`
*   Why use `Object Accessors` with `ref` rather than just re-using `reactive`?
*   Using `Reflect` & `Proxy` in Vue 3 allows us to add properties later that we want to be reactive, but what other benefits does this give us?
