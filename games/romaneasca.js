class Game {

    consts = {
        cardsInHand: 4,
        cardCount: 32,
        playerCount: 4
    }

    io
    code
    owner = {
        username: '',
        id: '',
        avatar: ''
    }
    state = 0
    players = []
    playerCount = 0
    teams = [
        { members: [], points: 0, shortname: 'diamond' },
        { members: [], points: 0, shortname: 'club' }
    ]
    readyCount = 0



    cards
    cardIndex = 0
    cardsInHand = 0
    tableCards = []

    second = 1000
    step = 100
    time = 0
    turnTime = this.second * 8
    turnCount = 0
    setCount = 0
    roundCount = 0

    currentPlayer = -1


    constructor(io, code, owner) {
        this.resetRoom(io, code, owner)
    }
    start() {
        this.state = 1
        this.shuffleCards(this.cards)


        this.fillCards()
        const gameInterval = setInterval(() => {
            if (this.state != 1) {
                clearInterval(gameInterval)
                return
            }
            ///////////

            if (this.isTurn()) {


                this.endTurn()

                if (this.turnCount % 4 == 1) {
                    this.endSet()
                    this.endRound()

                    this.newRound()
                    this.newSet()
                }

                this.newTurn()
            }



            if (this.time % this.second == 0) this.newSecond()
            this.time += this.step
        }, this.step)
    }
    end() {

    }
    stop() {

    }

    //SECONDS
    newSecond() {
        const timeLeft = (this.turnTime - this.time % this.turnTime) / this.second
        this.io.to(this.code).emit('newSecond', { timeLeft })
    }
    //TURNS
    isTurn() {
        return this.time % this.turnTime == 0
    }

    newTurn() {
        const team = this.currentPlayer % 2
        const member = Math.floor(this.currentPlayer / 2)
        this.io.to(this.code).emit('newTurn', { turnCount: this.turnCount, currentPlayer: { team, member } })
    }
    endTurn() {
        this.turnCount++;
        this.currentPlayer = (this.currentPlayer + 1) % 4
    }
    //SETS
    newSet() {
        this.turnCount = 1
        this.io.to(this.code).emit('newSet', { setCount: this.setCount })
    }
    endSet() {

        this.setCount++
    }

    //ROUNDS
    newRound() {
        this.io.to(this.code).emit('newRound', { roundCount: this.roundCount })
    }
    endRound() {
        this.roundCount++

    }



    shuffleCards(cards) {
        for (let i = 1; i < cards.length; i++) {
            const random = (Math.ceil(Math.random() * 100000)) % this.consts.cardCount + 1
            const aux = cards[i]
            cards[i] = cards[random]
            cards[random] = aux
        }
    }
    fillCards() {
        const number = Math.min(this.consts.cardsInHand - this.cardsInHand, Math.floor((this.consts.cardCount - this.cardIndex) / 4))
        if (number > 0) {
            this.cardsInHand += number
            this.dealCards(number)
        }
    }
    dealCards(number) {
        for (let i = 0; i < number; i++) {
            for (let m = 0; m < 2; m++) {
                for (let t = 0; t < 2; t++) {
                    this.teams[t].members[m].cards.push(this.cards[++this.cardIndex])
                }
            }
        }
        for (let m = 0; m < 2; m++) {
            for (let t = 0; t < 2; t++) {
                const member = this.teams[t].members[m]
                this.io.to(member.socket).emit('dealCards', { cards: member.cards })
            }
        }
    }
    updateTable() {

    }
    playCard(card, order) {
        const index = this.teams[order.team].members[order.member].cards.indexOf(card)
        if(index > -1){
            this.teams[order.team].members[order.member].cards.splice(index,1)
            const member = this.teams[order.team].members[order.member]
            this.io.to(member.socket).emit('dealCards', { cards: member.cards })
        }
    }
    resetRoom(io, code, owner) {
        this.io = io
        this.code = code
        this.owner.username = owner.username
        this.owner.id = owner.id
        this.owner.avatar = owner.avatar
        this.playerCount = 3
        this.players = [
            {
                id: 'UID1628609875245',
                username: 'Nigga',
                avatar: '1628621108219.jpg',
                socket: 'CMdfcddGDvJ7QV0NAAAD',
            },
            {
                id: 'UID1629463166947',
                username: 'Nicu blaj',
                avatar: 'default_avatar.svg',
                socket: '7LVTvfUWVhv0O78rAAAF'
            },
            {
                id: 'UID1628871142596',
                username: 'Maria',
                avatar: '1629465283721.jpg',
                socket: 'ZM7T1Ci34MGU-EGcAAAH'
            }
        ]
        this.resetGame()
    }
    resetGame() {
        this.state = 0
        this.readyCount = 3
        this.teams = [
            {
                members: [{
                    id: 'UID1628609875245',
                    username: 'Nigga',
                    avatar: '1628621108219.jpg',
                    socket: 'CMdfcddGDvJ7QV0NAAAD',
                    cards: []
                }], points: 0, shortname: 'diamond'
            },
            {
                members: [{
                    id: 'UID1629463166947',
                    username: 'Nicu blaj',
                    avatar: 'default_avatar.svg',
                    socket: '7LVTvfUWVhv0O78rAAAF',
                    cards: []
                },
                {
                    id: 'UID1628871142596',
                    username: 'Maria',
                    avatar: '1629465283721.jpg',
                    socket: 'ZM7T1Ci34MGU-EGcAAAH',
                    cards: []
                }], points: 0, shortname: 'club'
            }
        ]
        this.cards = ['00', 'CA', 'C7', 'C8', 'C9', 'C10', 'CJ', 'CQ', 'CK', 'DA', 'D7', 'D8', 'D9', 'D10', 'DJ', 'DQ', 'DK', 'HA', 'H7', 'H8', 'H9', 'H10', 'HJ', 'HQ', 'HK', 'SA', 'S7', 'S8', 'S9', 'S10', 'SJ', 'SQ', 'SK']
        this.cardIndex = 0
        this.cardsInHand = 0
        this.io.to(this.code).emit('clearTable')
        this.io.to(this.code).emit('clearHand')
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
    getMemberOrderBySocket(game, socketID) {
        for (let t = 0; t < 2; t++)
            for (let m = 0; m < 2; m++)
                if (game.teams[t].members[m].socket == socketID)
                    return { team: t, member: m }
        return null
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
                //console.log(`User ${playerID} left team : ${i}`)
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