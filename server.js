const express = require('express')
const cookieParser = require('cookie-parser')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)

app.set('viewengine', 'ejs')
app.use('/public', express.static('public'))
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())
app.use(logger)
io.use(socketMiddleware)


//ROUTES
const mainRoute = require('./routes/main')
const authRoute = require('./routes/auth')
const romaneascaRoute = require('./routes/romaneasca')(io)
const profileRoute = require('./routes/profile')

app.use('/',mainRoute)
app.use('/',authRoute)
app.use('/romaneasca',romaneascaRoute)
app.use('/profile', profileRoute)

const PORT = 2803
server.listen(PORT,() =>{
    console.log(`Server started on port ${PORT}.`)
})


function logger(req,res,next){
    //console.log(`[${req.method}] Request made at [${new Date().toLocaleTimeString()}] by [${req.ip}] for [${req.url}]` )
    next()
}
function socketMiddleware(socket, next){
    //console.log(`[SOCKET] Request made at [${new Date().toLocaleTimeString()}] by [${socket.id}]`)
    next()
}