
const EnteyOptionPlugin = require('./EnteyOptionPlugin')

// 挂载各种各个样的内置插件
class WebpackOptionsApply {
    process(options,compiler){
        // 注册插件
        new EnteyOptionPlugin().apply(compiler)
        // 触发entryOption钩子 也就是跟目录路径 entry入口 ./src/index.js
        compiler.hooks.entryOption.call(options.context,options.entry)
    }

}
module.exports = WebpackOptionsApply;