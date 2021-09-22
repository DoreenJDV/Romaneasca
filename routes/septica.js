const router = require('express').Router()
const verify = require('./verifyJWT')
const gameHandler = require('../games/gameHandler')
const Game = require('../games/septica')

module.exports = (io) => {

    let games = []

    router.get('/', verify, async (req, res) => {
        const game = {
            short: 'septica',
            name: 'Septica'
        }
        res.render('lobby.ejs', {
            user: req.user,
            game: game
        })
    })
    router.post('/create', verify, async (req, res) => {
        const code = Date.now().toString()
        const owner = req.user
        const game = new Game(io, code, owner)
        games.push(game)

        res.redirect('game/' + code)
    })
    router.get('/getGames', verify, (req, res) => {
        res.json(games.map(game => {
            return {
                code: game.code,
                owner: game.owner,
                playerCount: game.playerCount - gameHandler.getDisconnectedPlayers(game).length
            }
        }))
    })
    router.get('/game/:code', verify, async (req, res) => {
        const code = req.params.code
        const game = gameHandler.getGameByCode(games, code)
        if (game) {
            res.render('septica.ejs', { user: req.user, game: { code: code, short: 'septica' } })
        }
        else {
            res.redirect('/septica')
        }
    })


    io.on('connection', socket => {
        socket.on('connectedToGame', ({user, code})=>{
            socket.join(code)
        })
        socket.on('chat', async ({ message, user, code }) => {
            io.to(code).emit('chat', { message, user })
        })
        socket.on('disconnect', () =>{
            console.log('disconnected')
        })
        socket.on('ping', () => {
            if (gameHandler.getGameBySocket(games, socket.id) != null){
                socket.emit('pong')
            }
            else socket.emit('not pong')
        })
    })
    return router
}