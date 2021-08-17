const router = require('express').Router()
const verify = require('./verifyJWT')
const { Game, gameHandler } = require('../games/romaneasca')

module.exports = (io) => {
    let games = []

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

    router.post('/create', verify, async (req, res) => {
        const code = Date.now().toString()
        const owner = req.user
        const game = new Game(code, owner)
        games.push(game)

        res.redirect('game/' + code)
    })

    router.get('/game/:code', verify, (req, res) => {
        const code = req.params.code
        const game = gameHandler.getGame(games, code)

        // GATE KEEPING
        if (!game) {
            console.log('no such game ', req.params.code)
            return res.redirect('../../')
        }
        else if (game) {
            if (game.playerCount >= gameHandler.maxPlayerCount) {
                console.log('Room is full')
                return res.redirect('../../')
            }
        }
        const joc = {
            code: req.params.code
        }
        res.render('romaneasca.ejs', { user: req.user, game: joc })
    })
    router.get('/getGames', verify, (req, res) => {
        res.json(games.map(game => {
            return {
                code: game.code,
                owner: game.owner,
                playerCount: game.playerCount
            }
        }))
    })
    router.get('/canJoinGame/:code', verify, (req, res) => {
        const code = req.params.code
        const game = gameHandler.getGame(games, code)
        if (game.playerCount >= gameHandler.maxPlayerCount) return res.json({ canJoin: 0 })

        const isPlayer = gameHandler.isPlayerInGame(game, req.user.id)
        if (isPlayer == 0) {
            res.json({ canJoin: 1 })
        }
        else res.json({ canJoin: 0 })
    })
    router.get('/getPlayerCount/:code', (req, res) => {
        const game = gameHandler.getGame(games, req.params.code)

        if (game) {
            const playerCount = (game.playerCount)

            if (playerCount >= gameHandler.maxPlayerCount) {
                res.json({
                    status: 0,
                    message: 'Room is full'
                })
            }
            else {
                res.json({
                    status: 1,
                    message: 'joining'
                })
            }
        }
        else {
            res.json({
                status: 0,
                message: 'There is no game with this code.'
            })
        }
        return
    })

    io.on('connection', async socket => {

        socket.on('connectedToGame', async ({ user, code }) => {
            const game = gameHandler.getGame(games, code)
            console.log(`Connected [${socket.id}]`)
            const newPlayer = {
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                socket: socket.id
            }
            if (gameHandler.isPlayerInGame(game, newPlayer.id)) {
                console.log("IS PLAYER IN GAME: ", gameHandler.isPlayerInGame(game, newPlayer.id))
                socket.emit('backToRoot')
            }
            else {
                console.log(`There is no player [${newPlayer.id}]`)
                game.players.push(newPlayer)
                game.playerCount++
                socket.join(code)
            }
            io.to(code).emit('refreshPlayerList', game.players)
        })


        socket.on('disconnect', async () => {
            const game = gameHandler.getGameBySocket(games, socket.id)
            if (game) {

                const player = gameHandler.getPlayerBySocket(game, socket.id)

                let changeOwner = 0
                if (game.playerCount > 1 && player.id == game.owner.id) {
                    changeOwner = 1
                }

                game.players = game.players.filter(player => {
                    return player.socket != socket.id
                })
                if (changeOwner) {
                    game.owner = game.players[0]
                }
                game.playerCount--
                io.to(game.code).emit('refreshPlayerList', game.players)


                if (game.playerCount <= 0) {
                    gameHandler.disposeGame(games, game.code)
                    console.log('GAME REMOVED')
                }
                console.log(`Disconnected [${socket.id}]`)
            }
        })
    })


    return router
}