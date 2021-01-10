const webpack = require('./lib/webpack');
const webpackOptions = require('./webpack.config');

const compiler = webpack(webpackOptions);
// console.log('compiler: ', compiler);
compiler.run((err,stats)=>{
    // console.log(err);
    console.log(
        stats.toJson({
            entries:true,
            chunks:true,
            modules:true,
            assets:true
        })
    )
})