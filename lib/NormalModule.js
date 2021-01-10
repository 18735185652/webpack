const path = require('path');
const types = require('babel-types');
const generate = require('babel-generator').default;
const traverse = require('babel-traverse').default; 

class NormalModule {
    constructor({name,context,rawRequest,resource,parser,moduleId}){
        this.name =name;
        this.context = context; // 根目录
        this.rawRequest = rawRequest; // ./src/index.js
        this.moduleId = moduleId || ('./' + path.posix.relative(this.context,resource));
        this.resource = resource; //这个是模块的绝对路径
        this.parser = parser; // ast解析器 将源代码转化为ast抽象语法树
        this._source; // 此模块对应的源代码
        this._ast;  // 此模块对应的AST抽象语法树    
        this.dependencies = []; // 当前模块依赖模块的信息
       
    }
    /**
     * 编译本模块
     * @param {*} compilation 
     * @param {*} callback 
     */
    build(compilation,callback){
        this.doBuild(compilation,(err)=>{
            this._ast = this.parser.parse(this._source)
            traverse(this._ast,{
                // 当遍历到CallExpression节点的时候 就会进入回调
                CallExpression:(nodePath)=>{
                    let node = nodePath.node; //获取节点
                    
                    // 如果方法名是require
                    if(node.callee.name === 'require'){
                        node.callee.name = '__webpack_require__'; // 把方法名从require 改为__webpack_require__
                        let moduleName = node.arguments[0].value; // 模块的名称                    
                        // 获取扩展名
                        let extName = moduleName.split(path.posix.sep).pop().indexOf('.') === '-1'?'.js' :''                      
                        // 获取依赖模块（./src/title.js）
                        ///Users/gaopeng/Desktop/webpack_demo/src/title.js
                        let depResource = path.posix.join(path.posix.dirname(this.resource),moduleName+extName)
                        //  ./src/title.js
                        let depModuleId = './' + path.posix.relative(this.context,depResource)
                        node.arguments = [types.stringLiteral(depModuleId)] // 把require模块路径从./title.js变成了 ./src/title.js
                        this.dependencies.push({
                            name: this.name, //main
                            context: this.context,  // 根目录
                            rawRequest: moduleName, // 模块的相对路径 原始路径
                            moduleId : depModuleId, // 模块ID 它是一个相对于根目录的相对路径 以./ 开头
                            resource: depResource   // 依赖模块的绝对路径
                        })                     
                    }
                }

            })
            let {code} = generate(this._ast); // 把转换后的语法树重新生成源代码
            this._source = code;
            callback()
        })
    }
    doBuild(compilation,callback){
        this.getSource(compilation,(err,source)=>{
            //把最原始的代码存放到当前模块的_source上 
            // 我们的loader处理应该放在这个地方    
            this._source = source;
            callback()
        });
    }
    /**
     * 读取真正的源代码
     */
    getSource(compilation,callback){
        compilation.inputFileSystem.readFile(this.resource,'utf8',callback)

    }
}
module.exports = NormalModule

/**
 * 1. 从硬盘上把模块内容读取出来，读成一个文本
 * 2. 可能它不是一个JS模块，所以可能要走loader模块转化，最终肯定要得到一个JS模块，得不到就报错
 * 3. 把这个JS模块代码经过parse处理转成一个AST语法树
 * 4。分析AST黎明的依赖 也就是找 require import节点 分析依赖的模块
 * 5. 递归的编译依赖的模块
 * 6. 不停的一次递归执行上面5步，直到所有的模块编译完成为止
 */

 /**
  * 非常重要的问题
  * 模块的ID问题
  * 不管你是相对的本地模块 还是第三方模块
  * 最后它的moduleId 全部都是一个相对于项目根目录的相对路径
  * ./src/index.js
  * ./src/title.js
  * ./node_modules/util/util.js
  * 路径分隔符必须是 linux的 / 
  */