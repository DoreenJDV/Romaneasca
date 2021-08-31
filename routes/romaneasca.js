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
        const game = new Game(io, code, owner)
        games.push(game)

        res.redirect('game/' + code)
    })

    router.get('/game/:code', verify, (req, res) => {
        const code = req.params.code
        const game = gameHandler.getGameByCode(games, code)

        // GATE KEEPING
        if (!game) {
            //console.log('no such game ', req.params.code)
            return res.redirect('../../')
        }
        else if (game) {
            if (game.playerCount >= gameHandler.maxPlayerCount) {
                //console.log('Room is full')
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
        const game = gameHandler.getGameByCode(games, code)
        if (game.playerCount >= gameHandler.maxPlayerCount) return res.json({ canJoin: 0 })

        const isPlayer = gameHandler.isPlayerInGame(game, req.user.id)
        if (isPlayer == 0) {
            res.json({ canJoin: 1 })
        }
        else res.json({ canJoin: 0 })
    })
    // router.get('/getPlayerCount/:code', (req, res) => {
    //     const game = gameHandler.getGameByCode(games, req.params.code)

    //     if (game) {
    //         const playerCount = (game.playerCount)

    //         if (playerCount >= gameHandler.maxPlayerCount) {
    //             res.json({
    //                 status: 0,
    //                 message: 'Room is full'
    //             })
    //         }
    //         else {
    //             res.json({
    //                 status: 1,
    //                 message: 'joining'
    //             })
    //         }
    //     }
    //     else {
    //         res.json({
    //             status: 0,
    //             message: 'There is no game with this code.'
    //         })
    //     }
    //     return
    // })

    io.on('connection', async socket => {
        //console.log(`SOCKET [${socket.id}] is connected.`)

        socket.on('connectedToGame', async ({ user, code }) => {
            const game = gameHandler.getGameByCode(games, code)
            if (!game) {
                //console.log('There is no such game: ', code)
                socket.emit('backToRoot')
                return
            }
            //console.log(`Connected [${socket.id}]`)
            const newPlayer = {
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                socket: socket.id
            }
            if (gameHandler.isPlayerInGame(game, newPlayer.id)) {
                //console.log("IS PLAYER IN GAME: ", gameHandler.isPlayerInGame(game, newPlayer.id), newPlayer.id)
                //console.log(game.players)
                socket.emit('backToRoot')
            }
            else {
                //console.log(`There is no player [${newPlayer.id}]`)
                game.players.push(newPlayer)
                game.playerCount++
                socket.join(code)
                socket.broadcast.to(code).emit('chatAnnouncement', { message: `${newPlayer.username} joined the game!` })
            }
            io.to(code).emit('refreshPlayerList', { players: game.players, playerCount: game.playerCount })
            io.to(code).emit('refreshTeamMembers', { teams: game.teams, readyCount: game.readyCount })
        })

        socket.on('chooseTeam', async ({ team, user, code }) => {
            const teamNumber = team
            const game = gameHandler.getGameByCode(games, code)
            if (!game) return

            gameHandler.removePlayerFromTeam(game, user.id)

            user.cards = []
            user.socket = socket.id

            if (game.teams[teamNumber].members.length < 2) {
                game.teams[teamNumber].members.push(user)
                game.readyCount++
                //console.log(`User ${user.username} joined team : ${teamNumber}`)
            }

            io.to(code).emit('refreshTeamMembers', { teams: game.teams, readyCount: game.readyCount })

            //Starting game

            if (game.readyCount == gameHandler.maxPlayerCount) {
                let seconds = 5000
                const step = 50
                const startingInterval = setInterval(() => {
                    if (seconds > 0 && game.readyCount == gameHandler.maxPlayerCount) {
                        if (seconds % 1000 == 0)
                            io.to(code).emit('startingSeconds', { seconds: seconds / 1000 })
                        seconds -= step
                    }
                    else if (game.readyCount != gameHandler.maxPlayerCount) {
                        clearInterval(startingInterval)
                        io.to(code).emit('startingGameStopped')
                    }
                    else {
                        //REMOVE THIS
                        const aux1 = game.teams[0].members[0]
                        game.teams[0].members[0] = game.teams[0].members[1]
                        game.teams[0].members[1] = aux1

                        const aux2 = game.teams[1].members[0]
                        game.teams[1].members[0] = game.teams[1].members[1]
                        game.teams[1].members[1] = aux2
                        //
                        clearInterval(startingInterval)
                        io.to(code).emit('startingGame')
                        io.to(code).emit('gameStarted', { teams: game.teams })
                        game.start()
                    }
                }, step)
            }
        })
        socket.on('playCard', ({ card }) => {
            const game = gameHandler.getGameBySocket(games, socket.id)
            const order = gameHandler.getMemberOrderBySocket(game, socket.id)
            game.playCard(card, order)
        })
        socket.on('wontCut', () => {
            const game = gameHandler.getGameBySocket(games, socket.id)
            game.wontCut()
        })

        socket.on('chat', async ({ message, user, code }) => {
            io.to(code).emit('chat', { message, user })
        })
        
        socket.on('ping', () => {
            if (gameHandler.getGameBySocket(games, socket.id) != null)
                socket.emit('pong')
            else socket.emit('not pong')
        })
        socket.on('disconnect', async () => {
            const game = gameHandler.getGameBySocket(games, socket.id)
            if (game) {

                const player = gameHandler.getPlayerBySocket(game, socket.id)

                let changeOwner = 0
                if (game.playerCount > 1 && player.id == game.owner.id) {
                    changeOwner = 1
                }

                socket.broadcast.to(game.code).emit('chatAnnouncement', {  message: ` ${player.username} left the game!` })

                gameHandler.removePlayerFromTeam(game, player.id)
                gameHandler.removePlayerFromGame(game, player.id)

                if (changeOwner) {
                    game.owner = game.players[0]
                }

                io.to(game.code).emit('refreshPlayerList', { players: game.players, playerCount: game.playerCount })
                io.to(game.code).emit('refreshTeamMembers', { teams: game.teams, readyCount: game.readyCount })


                if (game.playerCount <= 0) {
                    setTimeout(() => {
                        if (game.playerCount <= 0) {
                            gameHandler.disposeGame(games, game.code)
                            //console.log('GAME REMOVED')
                        }
                    }, 5000)
                }
                //console.log(`Disconnected [${socket.id}]`)
            }
        })
    })


    return router
}