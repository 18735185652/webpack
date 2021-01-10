const Compiler = require('./Compiler');
const NodeEnvironmentPlugin = require('./node/NodeEnvironmentPlugin')
const WebpackOptionsApply = require('./WebpackOptionsApply')

const webpack = (options) =>{
    let compiler = new Compiler(options.context); //创建compiler实例
    compiler.options = options; //给他赋值options属性
    new NodeEnvironmentPlugin(options).apply(compiler); // 让compiler可以读写文件
    // 挂载配置文件里提供的所以plugins
    if(options.plugins && Array.isArray(options.plugins)){
        for(const plugin of options.plugins){
            plugin.apply(compiler);
        }
    }
    new WebpackOptionsApply().process(options,compiler)
   return compiler

}

exports = module.exports = webpack;