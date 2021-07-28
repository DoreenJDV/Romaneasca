const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)

app.set('viewengine', 'ejs')
app.use('/public', express.static('public'))
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(logger)

//ROUTES
const mainRoute = require('./routes/main')
const authRoute = require('./routes/auth')
const { urlencoded } = require('express')

app.use('/',mainRoute)
app.use('/',authRoute)




const PORT = 8000
app.listen(PORT,() =>{
    console.log(`Server started on port ${PORT}.`)
})

function logger(req,res,next){
    console.log(`[${req.method}] Request made at [${new Date().toLocaleTimeString()}] by [${req.ip}] for [${req.url}]` )
    next()
}