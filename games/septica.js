class Game {
    constructor(io, code, owner){
        this.io = io
        this.code = code
        this.owner = owner
    }
    io
    code
    owner

    playerCount = 0
    players = []


    resetGame(){
        this.playerCount = 0
        this.players = []
    }
}

module.exports = Game