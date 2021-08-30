const express = require('express')
const router = express.Router()
const verify = require('../routes/verifyJWT')
const db = require('../routes/mysql')()

router.get('/', verify, (req,res) =>{
    res.render('main.ejs',{user: req.user})
    
})
router.get('/getuser',verify, (req,res)=>{
    res.json(req.user)
})
router.get('/test', (req,res) =>{
    res.render('test.ejs')
})
module.exports = router