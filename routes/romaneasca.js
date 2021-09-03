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
            const player = gameHandler.getPlayerByID(game, req.user.id)
            if (player) {
                if (player.connected)
                    return res.redirect('../../')
                else { /* bloop */ }
            }
            else if (game.playerCount >= gameHandler.maxPlayerCount) {
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
                playerCount: game.playerCount - gameHandler.getDisconnectedPlayers(game).length
            }
        }))
    })
    router.get('/canJoinGame/:code', verify, (req, res) => {
        const code = req.params.code
        const game = gameHandler.getGameByCode(games, code)

        //if (game.state != 2 && game.playerCount >= gameHandler.maxPlayerCount) return res.json({ canJoin: 0 })

        const player = gameHandler.getPlayerByID(game, req.user.id)
        if (player) {
            if (player.connected == true) return res.json({ canJoin: 0 })
            else return res.json({ canJoin: 1 })
        }
        else if (game.playerCount >= gameHandler.maxPlayerCount) return res.json({ canJoin: 0 })
        else return res.json({ canJoin: 1 })



        /*
        if (isPlayer == 0) {
            res.json({ canJoin: 1 })
        }
        else if (game.state == 2 && player.connected == false) {
            res.json({ canJoin: 1 })
        }
        else res.json({ canJoin: 0 })*/
    })

    io.on('connection', async socket => {
        //console.log(`SOCKET [${socket.id}] is connected.`)

        socket.on('connectedToGame', async ({ user, code }) => {
            const game = gameHandler.getGameByCode(games, code)
            if (!game || game.state == 1) {
                //console.log('There is no such game: ', code)
                socket.emit('backToRoot')
                return

            }
            // GAME IS PAUSED
            if (game.state == 2) {

                const player = gameHandler.getPlayerByID(game, user.id)
                player.socket = socket.id
                player.connected = true

                const order = gameHandler.getMemberOrderByID(game, user.id)
                const member = game.teams[order.team].members[order.member]
                member.connected = true
                member.socket = socket.id

                socket.join(code)

                const disconnectedPlayers = gameHandler.getDisconnectedPlayers(game)
                io.to(code).emit('pause', { players: disconnectedPlayers })
                socket.broadcast.to(code).emit('chatAnnouncement', { message: `${player.username} rejoined the game!` })

                if (disconnectedPlayers.length == 0) {
                    game.unPause()

                    //FIX player
                    let myTurn
                    if (game.currentPlayer % 2 == order.team && Math.floor(game.currentPlayer / 2) == order.member)
                        myTurn = true
                    else myTurn = false

                    io.to(socket.id).emit('dealCards', { cards: member.cards })
                    io.to(socket.id).emit('playCard', { cards: game.tableCards, cutBy: game.cutBy })

                    if (myTurn && game.askToCut)
                        io.to(socket.id).emit('willCut', { show: true })
                    else
                        io.to(socket.id).emit('willCut', { show: false })

                    io.to(socket.id).emit('counts', { roundCount: game.roundCount, setCount: game.setCount, turnCount: game.turnCount })
                    io.to(socket.id).emit('newTurn', { turnCount: game.turnCount, currentPlayer: { team: game.currentPlayer % 2, member: Math.floor(game.currentPlayer / 2) } })
                    if (myTurn)
                        io.to(socket.id).emit('myTurn')

                }
                return
            }

            //GAME NOT STARTED YET
            //console.log(`Connected [${socket.id}]`)
            const newPlayer = {
                socket: socket.id,
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                connected: true
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
            if (!game || game.state != 0) return

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
                        //REMOVE THIS (DUMMY BOTS) 
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
            if (game && game.state == 1) {
                const order = gameHandler.getMemberOrderBySocket(game, socket.id)
                game.playCard(card, order)
            }
        })
        socket.on('wontCut', () => {
            const game = gameHandler.getGameBySocket(games, socket.id)
            const order = gameHandler.getMemberOrderBySocket(game, socket.id)
            if (game.currentPlayer % 2 != order.team || Math.floor(game.currentPlayer / 2) != order.member)
                return

            if (game && game.state == 1)
                game.wontCut()
        })

        socket.on('chat', async ({ message, user, code }) => {
            io.to(code).emit('chat', { message, user })
        })

        socket.on('disconnect', async () => {
            const game = gameHandler.getGameBySocket(games, socket.id)
            if (game) {

                const player = gameHandler.getPlayerBySocket(game, socket.id)

                if (game.state == 1 || game.state == 2) {  //Game started or paused
                    game.state = 2
                    gameHandler.getPlayerBySocket(game, socket.id).connected = false
                    const order = gameHandler.getMemberOrderBySocket(game, socket.id)
                    game.teams[order.team].members[order.member].connected = false

                    io.to(game.code).emit('pause', { players: gameHandler.getDisconnectedPlayers(game) })
                    socket.broadcast.to(game.code).emit('chatAnnouncement', { message: ` ${player.username} left the game!` })
                    game.pause()
                    return
                }

                let changeOwner = 0
                if (game.playerCount > 1 && player.id == game.owner.id) {
                    changeOwner = 1
                }
                socket.broadcast.to(game.code).emit('chatAnnouncement', { message: ` ${player.username} left the game!` })
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
                        }
                    }, 5000)
                }
            }

        })
        socket.on('ping', () => {
            if (gameHandler.getGameBySocket(games, socket.id) != null)
                socket.emit('pong')
            else socket.emit('not pong')
        })
    })
    return router
}