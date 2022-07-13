# Reading Source Code with Evan You

After learning the core concepts of Vue 3’s Reactivity Engine it’s time to dive into the code, and who better to lead us through it than the man who wrote it, Evan You. If you’d like to walk through the code with us, I’ve linked to the files we go through sequentially.

*   [createGetter in baseHandlers.ts](https://github.com/vuejs/vue-next/blob/master/packages/reactivity/src/baseHandlers.ts#L37)
*   [createSetter in baseHandlers.ts](https://github.com/vuejs/vue-next/blob/master/packages/reactivity/src/baseHandlers.ts#L71)
*   [track in effects.ts](https://github.com/vuejs/vue-next/blob/master/packages/reactivity/src/effect.ts#L135)
*   [trigger in effects.ts](https://github.com/vuejs/vue-next/blob/master/packages/reactivity/src/effect.ts#L161)

After walking through this code, Evan gives us a live demo of the brand new debugging hooks, allowing you to track when reactive data gets tracked and triggered using the `onTrack` and `onTrigger` hooks. When debugging components, you can use the `renderTracked` to discover when a reactive object is being associated with a component, and `renderTriggered` to discover when and why a component is re-rendering.

That’s the end of the Vue 3 Reactivity course, congratulations on getting through it! If you haven’t watched through the Vue 3 Essentials course, now would be a great time to go through it.
