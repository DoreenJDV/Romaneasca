const router = require('express').Router()
const verify = require('./verifyJWT')

router.get('/', verify, (req,res)=>{
    const game = {
        short:'romaneasca',
        name: 'Romaneasca'
    }
    res.render('lobby.ejs', {
        user : req.user,
        game: game
    })
})


module.exports = router