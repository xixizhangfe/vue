/* @flow */

import { baseOptions } from './options'
import { createCompiler } from 'compiler/index'

const { compile, compileToFunctions } = createCompiler(baseOptions)

export { compile, compileToFunctions }

/*
  compile是一个函数：
  function compile (
      template: string,
      options?: CompilerOptions
    ): CompiledResult {
      const finalOptions = Object.create(baseOptions)
      const errors = []
      const tips = []

      // 略

      if (options) {
        // 略
        // merge custom modules
        if (options.modules) {
          finalOptions.modules =
            (baseOptions.modules || []).concat(options.modules)
        }
        // merge custom directives
        if (options.directives) {
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          )
        }
        // copy other options
        for (const key in options) {
          if (key !== 'modules' && key !== 'directives') {
            finalOptions[key] = options[key]
          }
        }
      }

      finalOptions.warn = warn

      const compiled = baseCompile(template.trim(), finalOptions)
      if (process.env.NODE_ENV !== 'production') {
        detectErrors(compiled.ast, warn)
      }
      compiled.errors = errors
      compiled.tips = tips
      return compiled
    }

    可以看出，实际执行编译工作的是baseCompile这个函数，该函数是src/compiler/index.js里提供的：
    function baseCompile (
      template: string,
      options: CompilerOptions
    ): CompiledResult {
      const ast = parse(template.trim(), options)
      if (options.optimize !== false) {
        optimize(ast, options)
      }
      const code = generate(ast, options)
      return {
        ast,
        render: code.render,
        staticRenderFns: code.staticRenderFns
      }
    }

    也就是说，在最终执行compile函数后，返回的结果是：
    {
      ast,
      render: code.render,
      staticRenderFns: code.staticRenderFns
    }

    猜测其中render、staticRenderFns是一个字符串，所以需要compileToFunctions转成可执行的函数

*/

/*
  compileToFunctions是将render、staticRenderFns这两个转成函数
*/
