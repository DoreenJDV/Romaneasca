class Game {
    constructor(io, code, owner) {
        this.io = io
        this.code = code
        this.owner = owner
    }
    io
    code
    owner
    utils = {
        maxPlayerCount: 8
    }

    state = 0
    playerCount = 3
    players = [
        {
            socket: '',
            id: '',
            username: 'BOT Maria',
            avatar: '1629465283721.jpg',
            cards: [],
            state: 2
        },
        {
            socket: '',
            id: '',
            username: 'BOT Nicu',
            avatar: 'nicu.jpg',
            cards: [],
            state: 2
        },
        {
            socket: '',
            id: '',
            username: 'BOT Dada',
            avatar: 'default_avatar.svg',
            cards: [],
            state: 2
        }
    ]
    readyCount = 3

    step = 50
    time = 0
    second = 1000

    turnTime = this.second * 7
    turnCount = 0
    currentPlayer= -1

    gameInterval = null

    start() {
        console.log('start')
        this.state = 1
        this.startGameInterval()
    }
    gameLoop = () => {
        if (this.state != 1) {
            this.resetGameInterval()
            return
        }

        if (this.time % this.second == 0) {
            if(this.time % this.turnTime == 0){
                this.newTurn()
            }

            this.newSecond()
        }

        this.time += this.step
    }

    newSecond = () => {
        const secondsLeft = (this.turnTime - this.time % this.turnTime)/ this.second
        const turnSeconds = this.turnTime / this.second
        this.io.to(this.code).emit('newSecond', ({secondsLeft, turnSeconds}))
    }
    newTurn = ()=>{
        this.turnCount++
        this.currentPlayer = (this.currentPlayer+1) % this.playerCount

        this.io.to(this.code).emit('newTurn', {currentPlayer: this.currentPlayer})
        this.io.to(this.players[this.currentPlayer].socket).emit('myTurn')
    }

    startGameInterval() {
        this.resetGameInterval()
        this.gameInterval = setInterval(this.gameLoop, this.step)
    }
    resetGameInterval() {
        clearInterval(this.gameInterval)
        this.time = 0
    }

    resetGame() {
        this.state = 0
        this.playerCount = 0
        this.players = []
        this.readyCount = 0
        this.resetGameInterval()

    }
    setPlayersUnready() {
        this.players.forEach(player => {
            player.state = 1
        })
        this.readyCount = 0
        this.io.to(this.code).emit('getReady', { ready: false })
    }
}
module.exports = Game