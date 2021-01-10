const { Tapable, SyncHook } = require('tapable');
const ejs = require('ejs')
const NormalModuleFactory = require('./NormalModuleFactory');
const Parser = require('./Parser');
const async = require('neo-async');
const path = require('path');
const Chunk = require('./Chunk');
const fs = require('fs');
const mainTemplate = fs.readFileSync(path.join(__dirname,'templates','main.ejs'),'utf8')
const mainRender = ejs.compile(mainTemplate)
const normalModuleFactory = new NormalModuleFactory();
const parser = new Parser()


class Compilation extends Tapable {
    constructor(compiler) {
        super();
        this.compiler = compiler; //编译器对象
        this.options = compiler.options; // 选项
        this.context = compiler.context;    // 根目录
        this.inputFileSystem = compiler.inputFileSystem // 读取文件模块fs
        this.outputFileSystem = compiler.outputFileSystem  // 写入文件模块fs
        this.entries = []; // 入口模块的数组 这里放着所有的入口模块
        this.modules = []; // 模块的数组 这里放着所有的模块
        this._modules = {} // key 是模块id 值是模块的模块对象
        this.chunks = []; // 这里放着所有的代码块
        this.files = []; //  这里存放着本次编译所有的产出的文件名
        this.assets = {}; //  存放着生成资源 key是文件名 val是文件内容
        this.hooks = {
            succeedModule: new SyncHook(['module']), //成功构建完成一个模块后 就会触发此钩子执行
            seal: new SyncHook(),
            beforeChunks: new SyncHook(),
            afterChunks: new SyncHook(),
        }
    }
    //开始编译一个新的入口
    /**
     * 
     * @param {*} context 根目录
     * @param {*} entry 入口模块的相对路径 ./src/index.js
     * @param {*} name  入口的名字 main
     * @param {*} finalCallback 编译完成的回调
     */
    addEntry(context, entry, name, finalCallback) {
        this._addModuleChin(context, entry, name, (err, module) => {
            console.log('err:', err);

            finalCallback(err, module)
        })
    }
  
    _addModuleChin(context, rawRequest, name, callback) {
        this.createModule({
            name, // main
            context, // 根目录
            rawRequest, // 。/src/index.js
            resource: path.posix.join(context,rawRequest),// 入口的绝对路径
           // moduleId, // ./src/index.js
            parser,
        },entryModule=>{
            this.entries.push(entryModule)
        },callback)
    }
    /**
     * 
     * @param {*} data 要编译的模块信息
     * @param {*} addEntry 可选的增加入口的方法 如果这个模块是入口模块，添加到entries 如果不是 什么也不做
     * @param {*} callback  编译完成后调callback回掉
     */
    createModule(data, addEntry, callback) {
        // 通过模块工厂创建一个模块
        let module = normalModuleFactory.create(data)
        addEntry && addEntry(module) // 如果是入口模块 就添加到入口去
        this.modules.push(module); //给普通模块添加一个模块
        const afterBuild = (err, module) => {
            console.log('modussle: ', module);
            // TODO 编译依赖的模块
            if (module.dependencies.length > 0) {
                console.log(2);
                this.processModuleDependencies(module, err => {
                    callback(err, module)
                })
            } else {
                console.log(3);
                callback(4, module)
            }
        }
        this.buildModule(module, afterBuild);
    }
    /**
     * 
     * @param {*} module ./src/index.js
     * @param {*} callback 
     */
    processModuleDependencies(module, callback) {
        // 获取当前模块的依赖模块
        let dependencies = module.dependencies;
        // 遍历依赖模块 全部开始编译 当所有的依赖模块全部编译完成后才开始调用callback
        async.forEach(dependencies, (dependency, done) => {
            let { name, context, rawRequest, resource, moduleId } = dependency;
            this.createModule({
                name, // main
                context, // 根目录
                rawRequest, // 。/src/index.js
                resource,
                moduleId,
                parser,
            },null,done)
        }, callback)
    }
    /**
     * 
     * @param {*} module 要编译的模块
     * @param {*} afterBuild 编译完成后的回掉
     */
    buildModule(module, afterBuild) {
        // 模块的真正编译逻辑其实是放在module内部完成
        module.build(this, (err) => {
            // 走在着里意味着一个module模块已经编译完成了
            this.hooks.succeedModule.call(module);
            afterBuild(err, module);
        })
    }
    /**
     * 把模块封装成代码块chunk
     * @param {*} callback 
     */
    seal(callback){
        this.hooks.seal.call();
        this.hooks.beforeChunks.call(); //开始准备生成代码块
        // 默认情况下 每一个入口会生成一个代码块
        for(const entryModule of this.entries){
            const chunk = new Chunk(entryModule); // 根据入口模块得到一个代码块
            this.chunks.push(chunk);
            // 对所有的模块进行过滤 找出来哪些名称跟这个chunk一样的模块 组成一个数组赋值给Chunk.modules
            chunk.modules = this.modules.filter(module=>module.name === chunk.name);
        }
        this.hooks.afterChunks.call(this.chunks);
        this.createChunkAssets();
        callback()
    }
    createChunkAssets(){
        for(let i = 0; i< this.chunks.length;i++){
            const chunk = this.chunks[i];
            const file = chunk.name + '.js'; // 只是拿到了文件名
            chunk.files.push(file)
            let source = mainRender({
                entryId: chunk.entryModule.moduleId, // ./src/index.js
                modules: chunk.modules, // 此代码块对应的模块数组
            });
            this.emitAssets(file,source);
        }
    }
    emitAssets(file,source){
        this.assets[file] = source;
        this.files.push(file)
    }
}
module.exports = Compilation




function sum(target){
    let arr = [2,4,7,15]
    let obj = {};
    for(let i=0;i<arr.length;i++){
       if(obj[target - arr[i]] !== undefined){
           return [obj[target - arr[i]],i]
       }
       obj[arr[i]] = i;
    }
}

console.log(sum(9));