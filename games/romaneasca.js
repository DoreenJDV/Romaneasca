class Game {

    code
    owner 
    status = 0
    players = []
    playerCount = 0

    constructor(code, owner) {
        this.code = code
        this.owner = owner
        this.status = 0
        this.playerCount = 0
    }

    getCardSuit(card) {
        return card.subString(card.lenght - 1, card.lenght)
    }
    getCardValue(card) {

    }
}
gameHandler = {
    maxPlayerCount: 4,
    getGame: (games, code) => {
        return games.filter(game => {
            return code == game.code
        })
        return null
    },
    disposeGame: (games, code) => {
        games = games.filter(game => {
            return !(game.code == code)
        })
    },
    getPlayerCount: (game) =>{
        return game.playerCount
    }
}
module.exports = { Game, gameHandler }