---
title: vue源码解析
date: 2019-06-22 16:56:20
tags:
---
## <span id="entry">首先是入口文件: `src/platforms/web/entry-runtime-with-compiler.js`</span>

做了哪些事情呢？

1. 从`src/platforms/web/runtime/index.js`里导入`Vue`
2. 获取Vue原型上的`$mount`方法，先存下来
   `const mount = Vue.prototype.$mount`
3. 重写`Vue.prototype.$mount`
   1. 获取`el`
   2. 判断`this.$options`里是否有`render`函数，如果有直接进入第5步；没有则进入第三步
   3. 获取`template`（`template`可能来自`this.$options`，或者`getOuterHTML(el)`）
   4. 将`template`通过`compileToFunctions`方法编译为渲染函数，得到`render`, `staticRenderFns`，并将他们挂在`this.$options`上
   5. 返回`mount.call(this, el, hydrating)`，这里`mount`就是事先存下的
4. 在`Vue`上挂载`compile`方法
   `Vue.compile = compileToFunctions`
5. 导出`Vue`
   `export default Vue`

通常我们写代码时，会在`main.js`里，这样写：

```javascript
new Vue({
  // 这里是我们写的配置，对应的是this.$options
}).$mount('#app')
```
这里的`$mount`就是上面重写后的`Vue.prototype.$mount`，所以执行`$mount`时实际执行的是`mount.call(this, el, hydrating)`，也就是重写前的`Vue.prototype.$mount`。重写前的`Vue.prototype.$mount`来自`src/platforms/web/runtime/index.js`。我们去看一下这个文件里做了哪些事情。


## <span id="web-runtime-index">`src/platforms/web/runtime/index.js`</span>
做了哪些事情呢？

1. 从`src/core/index`里导入`Vue`
2. 安装平台指定的`utils`到`Vue.config`上
   ```javascript
   Vue.config.mustUseProp = mustUseProp
   Vue.config.isReservedTag = isReservedTag
   Vue.config.isReservedAttr = isReservedAttr
   Vue.config.getTagNamespace = getTagNamespace
   Vue.config.isUnknownElement = isUnknownElement
   ```
3. 安装平台指定的`directives`、`components`
   ```javascript
    extend(Vue.options.directives, platformDirectives)
    extend(Vue.options.components, platformComponents)
   ```
   `platformDirectives`包括`v-model`, `v-show`
   `platformComponents`包括`transition`、`transition-group`
4. 安装平台指定的`patch`函数
   ```javascript
   Vue.prototype.__patch__ = inBrowser ? patch : noop
   ```
5. 安装$mount方法到原型
   ```javascript
    Vue.prototype.$mount = function (
      el?: string | Element,
      hydrating?: boolean
    ): Component {
      el = el && inBrowser ? query(el) : undefined
      return mountComponent(this, el, hydrating)
    }
   ```
6. 导出`Vue`
   `export default Vue`

可以看到这个文件里定义了我们执行的`$mount`，而返回的是`mountComponent(this, el, hydrating)`，这个`mountComponent`方法来自`src/core/instance/lifecycle`。

## `src/core/instance/lifecycle`
`mountComponent`函数做了哪些事情呢？

1. 设置`vm.$el`: `vm.$el = el`
2. 执行`beforeMount`钩子: `callHook(vm, 'beforeMount')`
3. 实例化一个`watcher`
   ```javascript
    new Watcher(vm, updateComponent, noop, {
      before () {
        if (vm._isMounted && !vm._isDestroyed) {
          callHook(vm, 'beforeUpdate')
        }
      }
    }, true
   ```
4. 执行`mounted`钩子
   ```javascript
    if (vm.$vnode == null) {
      vm._isMounted = true
      callHook(vm, 'mounted')
    }
   ```
5. 返回`return vm`

可以看到这里就完成了整个组件的挂载，并且在这里调用了`new Watcher`，如果有更新，就执行`beforeUpdate`钩子。

这个`new Watcher`我们稍后再说。

总结：上面这些是顺着`.$mount('#app')`讲的，说明了执行`.$mount('#app')`过程中做了什么事情。那么`new Vue({// 这里是我们写的配置，对应的是this.$options})`这个实例化Vue的过程做了什么呢？请接着阅读下文


# Vue的实例化过程
从[第一部分入口文件](#entry)和[第二部分](#web-runtime-index)分析可知，最终我们在`main.js`里使用的`Vue`来自`src/core/index.js`，继续追踪`src/core/index.js`，发现`Vue`来自`src/core/instance/index.js`。

## `src/core/instance/index.js`
这个文件，定义了`Vue`函数，然后下面执行的一系列函数，就是在Vue的原型上添加属性。

```javascript
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue

```

这一系列函数就是关键了。

## `initMixin`
来自`src/core/instance/init.js`，它在`Vue`原型上设置了`_init`方法（只是定义，没有执行），来看一下这个`_init`方法：

1. 设置`vm`等于`this`
2. 设置`vm.$options`
3. 设置`vm._renderProxy`
4. 设置`vm._self = vm`
5. 初始化生命周期之类的：
   ```javascript
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')
  ```
6. 如果有el，则执行$mount。

### `initLifecycle`
```javascript
  vm.$parent = parent
  vm.$root = parent ? parent.$root : vm

  vm.$children = []
  vm.$refs = {}

  vm._watcher = null
  vm._inactive = null
  vm._directInactive = false
  vm._isMounted = false
  vm._isDestroyed = false
  vm._isBeingDestroyed = false
```

### `initEvents`
```javascript
  vm._events = Object.create(null)
  vm._hasHookEvent = false
  // init parent attached events
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
```

### `initRender`
```javascript
  vm._vnode = null // the root of the child tree
  vm._staticTrees = null
  vm.$slots
  vm.$scopedSlots
  vm._c
  vm.$createElement
  defineReactive(vm, '$attrs',...
  defineReactive(vm, '$listeners',...
```

### `initInjections`
解析inject，关闭响应式

### `initState`
设置`vm._watchers = []`
1. `initProps`
   定义`vm._props`
   校验`props`
   关闭响应式，然后`defineReactive(props, key, value,...`
   proxy(vm, `_props`, key)
2. `initMethods`: `vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)`
3. `initData`
   定义`vm._data`
   `proxy(vm, '_data', key)`
   `observe(data, true)`
4. `initComputed`
   定义`vm._computedWatchers`
   对每个key new一个watcher
5. `initWatch`
   `createWatcher`

### `initProvide`
设置`vm._provided`为vm.$options.provide


## `stateMixin`
来自`src/core/instance/state.js`：

1. 定义`Vue.prototype.$data`，其get方法是返回`this._data`
2. 定义`Vue.prototype.$props`，其get方法是返回`this._props`
3. 定义`Vue.prototype.$set = set`, 这个`set`来自`src/core/observer/index`
4. 定义`Vue.prototype.$delete = del`, 这个`del`来自`src/core/observer/index`
5. 定义`Vue.prototype.$watch`

## `eventsMixin`
来自`src/core/instance/event.js`：

1. 定义`Vue.prototype.$on`、`Vue.prototype.$once`、`Vue.prototype.$off`、`Vue.prototype.$emit`

## `lifecycleMixin`
来自`src/core/instance/lifecycle.js`：

1. 定义`Vue.prototype._update`、`Vue.prototype.$forceUpdate`、`Vue.prototype.$destroy`

## `renderMixin`
来自`src/core/instance/render.js`：

1. 执行`installRenderHelpers`，略
2. 定义`Vue.prototype.$nextTick`
3. 定义`Vue.prototype._render`


# `new Watcher`
还记得我们上面分析`.$mount`执行过程时，留着一个`new Watcher`没说呢。`Watcher`是在`src/core/observer/watcher.js`里定义的。下面就开始分析：


