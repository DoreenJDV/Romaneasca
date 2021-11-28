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
        res.json({
            games: games.map(game => {
                return {
                    code: game.code,
                    owner: game.owner,
                    playerCount: game.playerCount
                }
            }),
            maxPlayerCount: games[0] && games[0].utils.maxPlayerCount
        })
    })
    router.get('/canJoinGame/:code', verify, (req, res) => {
        const code = req.params.code
        const game = gameHandler.getGameByCode(games, code)

        if (game.state != 0) return res.json({ canJoin: 0 })
        if (game.playerCount >= game.utils.maxPlayerCount) return res.json({ canJoin: 0 })
        const player = gameHandler.getPlayerByID(game, req.user.id)
        if (player) return res.json({ canJoin: 0 })
        return res.json({ canJoin: 1 })
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
        socket.on('connectedToGame', ({ user, code }) => {
            const game = gameHandler.getGameByCode(games, code)

            if (!game || game.state != 0) {
                io.to(socket.id).emit('redirect')
                return
            }

            const newPlayer = {
                socket: socket.id,
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                cards: [],
                state: 1  //0-disconnected 1-connected 2-ready 3-won
            }

            const player = gameHandler.getPlayerByID(game, user.id)
            if (player) {
                socket.to(socket.id).emit('redirect')
                return
            }

            game.players.push(newPlayer)
            game.playerCount++
            socket.join(code)

            socket.broadcast.to(code).emit('chatAnnouncement', { message: `${newPlayer.username} joined the game!` })
            //game.setPlayersUnready()  //Commented for debug only
            io.to(game.code).emit('refreshWaitingScreen', { players: game.players, maxPlayerCount: game.utils.maxPlayerCount })

        })
        socket.on('getReady', () => {
            const game = gameHandler.getGameBySocket(games, socket.id)
            if (!game) return
            const player = gameHandler.getPlayerBySocket(game, socket.id)
            if (!player) return

            let ready
            if (player.state == 1) {
                player.state = 2
                ready = true
            }
            else if (player.state == 2) {
                player.state = 1
                ready = false
            }
            game.readyCount = game.players.filter(player => player.state == 2).length

            io.to(game.code).emit('refreshWaitingScreen', { players: game.players, maxPlayerCount: game.utils.maxPlayerCount })
            socket.emit('getReady', { ready })

            //Starting
            if (game.playerCount >= 2 && game.readyCount == game.playerCount) {
                let startingSeconds = 5
                let miliseconds = 0
                const step = 50
                let startingInterval = setInterval(() => {
                    if (game.playerCount < 2 || game.readyCount != game.playerCount) {
                        clearInterval(startingInterval)
                        miliseconds = 0
                        startingSeconds = 5
                        return
                    }
                    if (miliseconds % 1000 == 0) {
                        if (startingSeconds <= 0) {
                            clearInterval(startingInterval)
                            miliseconds = 0
                            startingSeconds = 5

                            //START

                            let aux = game.players[0]
                            game.players[0] = game.players[2]
                            game.players[2] = aux

                            if (game.players.length > 3) {
                                aux = game.players[1]
                                game.players[1] = game.players[3]
                                game.players[3] = aux
                            }

                            io.to(game.code).emit('start', { players: game.players })
                            game.start()
                        }
                        io.to(game.code).emit('startingSeconds', ({ startingSeconds }))
                        startingSeconds--
                    }
                    miliseconds += step
                }, step)
            }
        })
        socket.on('playCard', ({ card }) => {
            const game = gameHandler.getGameBySocket(games, socket.id)
            if (!game) return

            const playerIndex = game.players.findIndex(player => player.socket == socket.id)
            game.playCard(card, playerIndex)
        })
        socket.on('playCard7', ({ card, newSuit }) => {
            const game = gameHandler.getGameBySocket(games, socket.id)
            if (!game) return

            const playerIndex = game.players.findIndex(player => player.socket == socket.id)
            game.playCard7(card, newSuit, playerIndex)

        })
        socket.on('drawCard', () => {
            const game = gameHandler.getGameBySocket(games, socket.id)
            if (!game) return

            const playerIndex = game.players.findIndex(player => player.socket == socket.id)
            game.drawCard(playerIndex)
        })
        socket.on('giveUp', () => {
            const game = gameHandler.getGameBySocket(games, socket.id)
            if (!game) return

            const playerIndex = game.players.findIndex(player => player.socket == socket.id)
            game.giveUp(playerIndex)
        })
        socket.on('chat', async ({ message, user, code }) => {
            io.to(code).emit('chat', { message, user })
        })
        socket.on('disconnect', () => {
            const game = gameHandler.getGameBySocket(games, socket.id)
            if (!game) return

            const player = gameHandler.getPlayerBySocket(game, socket.id)
            if (!player) return

            if (game.state == 0) {
                gameHandler.removePlayerFromGame(game, player.id)
                socket.to(socket.id).emit('redirect')

                if (game.playerCount <= 0) {
                    setTimeout(() => {
                        if (game.playerCount <= 0) gameHandler.disposeGame(games, game.code)
                    }, 5000)
                }
                io.to(game.code).emit('refreshWaitingScreen', { players: game.players, maxPlayerCount: game.utils.maxPlayerCount })
            }
            else if (game.state != 3) {
                player.state = 0

                io.to(game.code).emit('updatePlayers', { players: game.players })
                io.to(game.code).emit('newTurn', { currentPlayer: game.currentPlayer })
            }

            //game.setPlayersUnready() //Commented for debug only
        })
        socket.on('ping', () => {
            if (gameHandler.getGameBySocket(games, socket.id) != null) socket.emit('pong')
            else socket.emit('not pong')
        })
    })
    return router
}