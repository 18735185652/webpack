let async = require('neo-async');


let arr = [1,2,3];

function forEach(arr,callback,finalCallback){
    let total = arr.length;
    const done = ()=>{
        if(--total === 0){
            finalCallback()
        }
    }
    arr.forEach(item=>{
        callback(item,done)
    })
}

console.time('cost')
// 同时开始 全部结束之后在打印
forEach(arr,(item,done)=>{
    setTimeout(()=>{
        console.log(item);
        done()
    },1000 * item)
},()=>{
    console.timeEnd('cost');
})