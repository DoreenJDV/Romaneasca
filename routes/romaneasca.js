const router = require('express').Router()
const verify = require('./verifyJWT')

router.get('/', verify, async (req, res) => {


    const game = {
        short: 'romaneasca',
        name: 'Romaneasca'
    }
    res.render('lobby.ejs', {
        user: req.user,
        game: game
    })
})

router.post('/create',verify, async (req, res) => {

    res.render('romaneasca.ejs', { user: req.user })
})
router.post('/join/:code',verify, (req, res) => {

})
module.exports = router