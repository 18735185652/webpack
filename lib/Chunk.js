class Chunk{
    constructor(entryModule){
        this.entryModule = entryModule; // 此代码块的入口模块
        this.name = entryModule.name;   // 代码块的名称 main
        this.files = [];    // 这个代码生成了哪些文件
        this.modules = []; // 这个代码块包含哪些模块


    }
}
module.exports = Chunk;