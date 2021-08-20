class Game {

    io
    code
    owner = {
        username: '',
        id: '',
        avatar: ''
    }
    status = 0
    players = []
    playerCount = 0
    teams = [
        { members: [], points: 0, shortname: 'diamond' },
        { members: [], points: 0, shortname: 'club' }
    ]
    readyCount = 0
    cards

    second = 1000
    secondCount = 0
    turnCount
    setCount
    roundCount


    constructor(io, code, owner) {
        this.resetRoom(io, code, owner)
    }
    start() {
        this.status = 1
        this.shuffleCards(this.cards)


        const gameInterval = setInterval(()=>{
            if(this.status != 1){
                clearInterval(gameInterval)
                return
            }

            this.newSecond()


        }, this.second)
    }
    stop() {

    }
    end() {

    }

    //SECONDS
    newSecond(){
        this.secondCount++
        this.io.to(this.code).emit('newSecond', {second: this.secondCount})
    }

    //TURNS
    newTurn(){

    }
    endTurn(){

    }
    //SETS
    newSet(){

    }
    endSet(){

    }

    //ROUNDS
    newRound(){

    }
    endRound(){

    }
    resetRoom(io, code, owner) {
        this.io = io
        this.code = code
        this.owner.username = owner.username
        this.owner.id = owner.id
        this.owner.avatar = owner.avatar
        this.playerCount = 0
        this.players = []
        this.resetGame()
    }
    resetGame() {
        this.status = 0
        this.readyCount = 0
        this.teams = [
            { members: [], points: 0, shortname: 'diamond' },
            { members: [], points: 0, shortname: 'club' }
        ]
        this.cards = ['CA', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'CJ', 'CQ', 'CK', 'DA', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'DJ', 'DQ', 'DK', 'HA', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10', 'HJ', 'HQ', 'HK', 'SA', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'SJ', 'SQ', 'SK']

        this.io.to(this.code).emit('clearTable')
        this.io.to(this.code).emit('clearHand')
    }
    shuffleCards(cards) {
        for (let i = 0; i < cards.length; i++) {
            const random = (Math.ceil(Math.random() * 1000)) % cards.length
            const aux = cards[i]
            cards[i] = cards[random]
            cards[random] = aux
        }
    }
}
gameHandler = {
    maxPlayerCount: 4,
    getGameByCode: (games, code) => {
        return games.filter(game => {
            return code == game.code
        })[0]
    },
    getGameBySocket: (games, socketID) => {
        return games.filter(game => {
            const foundPlayer = game.players.filter(player => {
                return player.socket == socketID
            })
            if (foundPlayer[0]) return 1;
            else return 0;
        })[0]
    },
    getPlayerBySocket: (game, socketID) => {
        return game.players.filter(player => {
            return player.socket == socketID
        })[0]
    },
    getPlayerByID: (game, id) => {
        return game.players.filter(player => {
            return player.id == id
        })[0]
    },
    isPlayerInGame: (game, playerID) => {
        const newFilter = game.players.filter(player => {
            if (player.id == playerID) return 1
            return 0
        })
        if (newFilter.length == 0) return 0
        return 1
    },
    removePlayerFromGame: (game, playerID) => {
        const index = game.players.map(player => player.id).indexOf(playerID)
        if (index > -1) {
            game.players.splice(index, 1)
            game.playerCount--
        }
    },
    removePlayerFromTeam: (game, playerID) => {
        game.teams.forEach((team, i) => {
            const index = team.members.map(member => member.id).indexOf(playerID)
            if (index > -1) {
                team.members.splice(index, 1)
                game.readyCount--
                console.log(`User ${playerID} left team : ${i}`)
            }
        })
    },
    disposeGame: (games, code) => {
        games.splice(games.map(game => game.code).indexOf(code), 1)
    },
    getCardSuit(card) {
        return card.substr(0, 1)
    },
    getCardValue(card) {
        let value = card.substrt(1, 1)
        if (value == '1') value = '10'
        return value
    }
}
module.exports = { Game, gameHandler }