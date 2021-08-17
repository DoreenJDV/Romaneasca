class Game {

    code
    owner = {
        username: '',
        id: '',
        avatar: ''
    }
    status = 0
    players = []
    playerCount = 0

    constructor(code, owner) {
        this.code = code
        this.owner.username = owner.username
        this.owner.id = owner.id
        this.owner.avatar = owner.avatar
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
        })[0]
    },
    disposeGame: (games, code) => {
        games.splice(games.map(game => game.code).indexOf(code),1)
    },
    isPlayerInGame: (game, playerID) => {
        const newFilter = game.players.filter(player => {
            if (player.id == playerID) return 1
            return 0
        })
        if (newFilter.length == 0) return 0
        return 1
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
    }
}
module.exports = { Game, gameHandler }