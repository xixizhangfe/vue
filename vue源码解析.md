---
title: vue源码解析
date: 2019-06-22 16:56:20
tags:
---
## 首先是入口文件: `src/platforms/web/entry-runtime-with-compiler.js`

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


## `src/platforms/web/runtime/index.js`
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
