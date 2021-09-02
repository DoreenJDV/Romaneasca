let x = 0
let step = 500

function loop(){
    console.log(x)
}
let interval

function startInterval(){
    x++
    console.log('start')
    interval = setInterval(loop, step)
}
function stopInterval(){
    console.log('stop')
    clearInterval(interval)
    
}