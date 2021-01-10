const { SyncHook, SyncBailHook, AsyncSeriesHook, AsyncParallelHook, Tapable } = require('tapable');
const mkdirp = require('mkdirp') // 递归的创建新的文件夹
const path = require('path')

const NormalModuleFactory = require('./NormalModuleFactory')
const Compilation = require('./Compilation');
const Stats = require('./Stats');


class Compiler extends Tapable {
    constructor(context) {
        super()
        this.context = context
        this.hooks = {
            entryOption: new SyncBailHook(['context', 'entry']), // entry入口文件路径 。/src/index.js     
            beforeRun: new AsyncSeriesHook(['compiler']), // 运行前
            run: new AsyncSeriesHook(['compiler']), // 运行
            beforeCompile: new AsyncSeriesHook(['params']), //编译前
            compile: new SyncHook(['params']), // 开始编译
            make: new AsyncParallelHook(['compilation']), // 构建
            thisCompilation: new SyncHook(['compilation', 'params']), // 开始一次新的编译
            compilation: new SyncHook(['compilation', 'params']), // 创建完成一个新的compilation
            afterCompiler: new AsyncSeriesHook(['compilation']), // 编译完成 
            emit: new AsyncSeriesHook(['compilation']), // 发射或者说写入
            done: new AsyncSeriesHook(['stats']), //所有的编译全部完成
        }
    }
    run(callback) {
        console.log('Compiler run');
        // 编译完成后最终的回调函数
        const onCompiled = (err, compilation) => {
            this.emitAssets(compilation, () => {
                // 收集编译信息 chunks entries modules files assets
                let stats = new Stats(compilation);
                this.hooks.done.callAsync(stats, () => {
                    callback(err, stats)
                })
            })
        }
        this.hooks.beforeRun.callAsync(this, err => {
            this.hooks.run.callAsync(this, err => {
                this.compiler(onCompiled)
            })
        })
    }
    emitAssets(compilation, callback) {
        console.log('onCompilied');
        // finalCallback(null,new Stats(compilation)) 
        // 把chunk 变成文件写入硬盘
        const emiFiles = (err) => {
            const assets = compilation.assets;
            let outputPath = compilation.options.output.path;
            for (let file in assets) {
                let source = assets[file];
                // 输出文件的绝对路径
                let targetPath = path.posix.join(outputPath, file);
                // console.log('this',this);
                this.outputFileSystem.writeFileSync(targetPath, source, 'utf8')
            }
            callback()
        }
        // 先触发emit的回调，在写插件的时候emit用的很多，因为它是修改输出内容的最后机会
        this.hooks.emit.callAsync(compilation, () => {
            // 先创建dist目录，在写入文件
            mkdirp(this.options.output.path, emiFiles)
        })
        // {
        //     entries:[], //显示所有入口
        //     chunks:[], //代码块
        //     module:[], //所有模块
        //     assets:[] //显示所有打包后的资源 也就是文件
        // }
    }
    compiler(onCompiled) {
        const params = this.newCompilationParams();
        this.hooks.beforeCompile.callAsync(params, err => {
            this.hooks.compile.call(params);
            const compilation = this.newCompilation(params);
            this.hooks.make.callAsync(compilation, err => {
                console.log('make 完成');
                // 封装代码块之后编译就完成了
                compilation.seal(err => {
                    // 触发编译完成的钩子
                    this.hooks.afterCompiler.callAsync(compilation, (err) => {
                        onCompiled(err, compilation)
                    })
                })
            })
        })
    }
    newCompilation(params) {
        const compilation = this.createCompilation(params);
        this.hooks.thisCompilation.call(compilation, params);
        this.hooks.compilation.call(compilation, params);
        return compilation;
    }
    createCompilation() {
        return new Compilation(this)
    }
    newCompilationParams() {
        const params = {
            // 创建compilation之前已经创建了一个普通模块工厂
            normalModuleFactory: new NormalModuleFactory(),
        }
        return params;
    }
}

module.exports = Compiler;
