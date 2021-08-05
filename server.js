const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const cookieParser = require('cookie-parser')

app.set('viewengine', 'ejs')
app.use('/public', express.static('public'))
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())
app.use(logger)

//ROUTES
const mainRoute = require('./routes/main')
const authRoute = require('./routes/auth')
const romaneasca = require('./routes/romaneasca')
const profile = require('./routes/profile')

app.use('/',mainRoute)
app.use('/',authRoute)
app.use('/romaneasca',romaneasca)
app.use('/profile', profile)

const PORT = 2603
app.listen(PORT,() =>{
    console.log(`Server started on port ${PORT}.`)
})

function logger(req,res,next){
    console.log(`[${req.method}] Request made at [${new Date().toLocaleTimeString()}] by [${req.ip}] for [${req.url}]` )
    next()
}