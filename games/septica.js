class Game {
    constructor(io, code, owner){
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
    playerCount = 0
    players = []
    readyCount = 0

    start(){
        console.log('start')
    }

    resetGame(){
        this.state = 0
        this.playerCount = 0
        this.players = []
        this.readyCount = 0
    }
    setPlayersUnready(){
        this.players.forEach(player =>{
            player.state = 1
        })
        this.readyCount = 0
        this.io.to(this.code).emit('getReady', {ready: false})
    }
}
module.exports = Game