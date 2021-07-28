const express = require('express')
const router = express.Router()

router.get('/', (req,res) =>{
    res.redirect('/auth')
    res.render('main.ejs')
})




module.exports = router