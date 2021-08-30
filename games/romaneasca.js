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
        { members: [], score: 0, shortname: 'diamond' },
        { members: [], score: 0, shortname: 'club' }
    ]
    readyCount = 0

    second = 1000
    step = 100
    turnTime = this.second * 6
    timerType = 1 // or '2' (to have enough time to react to the last played card)
    time = 0
    turnCount = 0
    setCount = 0
    roundCount = 0

    cards
    cardIndex = 0
    cardsInHand = 0
    tableCards = []

    currentPlayer = -1
    playedThisTurn = false
    base = {
        player: 0,
        card: '00'
    }
    cutBy = 0
    askToCut = false
    forceTurnEnd = false

    constructor(io, code, owner) {
        this.resetRoom(io, code, owner)
    }

    start() {
        //REMOVE MEMBER SWITCH !!!

        this.state = 1
        this.shuffleCards(this.cards)


        this.fillCards()
        const gameLoop = () => {
            if (this.state != 1 || this.playerCount < this.consts.playerCount) {
                this.state = 0
                clearInterval(gameInterval)
                return
            }

            // END OF CYCLE
            if (this.isTurn())
                this.endTurn()

            if (this.isTurn() && this.turnCount % 4 == 1)
                this.endSet()

            if (this.isTurn() && this.turnCount % 4 == 1)
                this.endRound()


            //END GAME
            if (this.isTurn() && this.cardsInHand < 1) {
                clearInterval(gameInterval)
                this.end()
                return
            }

            // NEW CYCLE
            if (this.isTurn() && this.turnCount % 4 == 1)
                this.newRound()

            if (this.isTurn() && this.turnCount % 4 == 1)
                this.newSet()

            if (this.isTurn())
                this.newTurn()


            if (this.time % this.second == 0) this.newSecond()
            this.time += this.step
        }
        const gameInterval = setInterval(gameLoop, this.step)

    }
    end() {
        console.log('R', this.roundCount, 'S', this.setCount, 'T', this.turnCount, 'CiH', this.cardsInHand)

        const score = [this.teams[0].score, this.teams[1].score]
        const members = this.teams.map(team => {
            return team.members
        }).map(member => {
            return { username: member.username, avatar: member.avatar }
        })
        this.io.to(this.code).emit('gameEnd', { score, members })
    }
    stop() {

    }

    //SECONDS
    newSecond() {
        const timeLeft = (this.turnTime - this.time % this.turnTime) / this.second
        let maxTime
        if (this.timerType == 1) maxTime = this.turnTime / this.second
        else if (this.timerType == 2) maxTime = 3 // 3 is here
        this.io.to(this.code).emit('newSecond', { timeLeft, maxTime, timerType: this.timerType })
    }
    isTurn() {
        return this.time % this.turnTime == 0
    }

    //TURNS
    endTurn() {
        if (this.playedThisTurn == false && this.turnCount != 0) {
            if (this.askToCut == true) {
                this.afkToCut = false
                this.turnCount = 1
                this.setCount = 0
                this.cardsInHand++
                this.playedThisTurn = true
                this.forceTurnEnd = true
                return
            }
            else this.forcePlay()
            //return
        }
        // if(this.turnCount == 4 && this.timerType == 1){
        //     this.setRestingTime(3)
        //     return
        // }
        //New turn
        this.turnCount++;
        this.currentPlayer = (this.currentPlayer + 1) % 4
        this.playedThisTurn = false

        this.io.to(this.code).emit('willCut', { show: false })
    }
    newTurn() {
        console.log(this.roundCount, this.setCount, this.turnCount, 'askToCut', this.askToCut)
        this.timerType = 1

        const team = this.currentPlayer % 2
        const member = Math.floor(this.currentPlayer / 2)
        this.io.to(this.code).emit('newTurn', { turnCount: this.turnCount, currentPlayer: { team, member }, cutBy: this.cutBy })
        this.io.to(this.teams[team].members[member].socket).emit('myTurn')
        this.forceTurnEnd = false
    }

    //SETS
    endSet() {
        if (this.roundCount != 0) this.cardsInHand--
        //New set
        this.setCount++
        if (this.setCount != 1 && this.canCut() && this.forceTurnEnd == false) {
            const t = this.base.player % 2
            const m = Math.floor(this.base.player / 2)
            const player = this.teams[t].members[m]
            this.io.to(player.socket).emit('willCut', { show: true })
            this.askToCut = true
        }
        else {
            this.askToCut = false
        }
    }
    newSet() {
        this.io.to(this.code).emit('newSet', { setCount: this.setCount })
        this.turnCount = 1
    }

    //ROUNDS
    endRound() {
        if (this.askToCut == true) return

        if (this.roundCount != 0 && this.timerType == 1) {
            this.setRestingTime(3)
            this.turnCount = 0
            this.cardsInHand++
            return
        }

        this.scoreCards()
        this.tableCards = []
        //New round

        this.base.player = this.cutBy
        this.currentPlayer = this.base.player

        this.roundCount++
        this.fillCards()
    }
    newRound() {
        if (this.askToCut == true) return

        this.setCount = 1
        const score = [this.teams[0].score, this.teams[1].score]
        this.io.to(this.code).emit('newRound', { roundCount: this.roundCount, score })
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
    playCard(card, order) {
        //THEIR TURN ONLY
        if (this.currentPlayer % 2 == order.team && Math.floor(this.currentPlayer / 2) == order.member && this.playedThisTurn == false) {
            const index = this.teams[order.team].members[order.member].cards.indexOf(card)
            //IF THE CARD IS IN THE HAND (AND NOT FAKE)
            if (index > -1) {

                let isCut = false
                //SET BASE
                if (this.setCount == 1 && this.turnCount == 1) {
                    this.base.card = card
                    //console.log("BASE CARD", card)
                }
                //CHECK IF CUT
                else if (this.getCardValue(this.base.card) == this.getCardValue(card) || this.getCardValue(card) == '7') {
                    this.cutBy = this.currentPlayer
                    isCut = true
                    //console.log('CUT BY PLAYER', this.currentPlayer)
                }
                if (!isCut && this.askToCut == true) {  //ForcePlay: Daca poate taia, dar prima carte nu e taietura
                    console.log('automatic give up')
                    return
                }

                this.askToCut = false

                //REMOVE CARD FROM HAND
                this.teams[order.team].members[order.member].cards.splice(index, 1)
                const member = this.teams[order.team].members[order.member]
                this.io.to(member.socket).emit('dealCards', { cards: member.cards })
                this.playedThisTurn = true

                //UPDATE TABLE || PlayCard
                this.tableCards.push(card)
                this.io.to(this.code).emit('playCard', { cards: this.tableCards, cutBy: this.cutBy })

                this.setTime(0)
            }
        }
    }
    forcePlay() {
        const t = this.currentPlayer % 2
        const m = Math.floor(this.currentPlayer / 2)

        const card = this.teams[t].members[m].cards[0]
        if (card) {
            this.playCard(card, { team: t, member: m })
        }
    }
    canCut() {
        if (this.base.player % 2 == this.cutBy % 2) {
            return false
        }
        const t = this.base.player % 2
        const m = Math.floor(this.base.player / 2)
        const cuts = this.teams[t].members[m].cards.filter(card => {
            return this.getCardValue(card) == '7' || this.getCardValue(card) == this.getCardValue(this.base.card)
        })[0]

        if (cuts != null) return true
        else return false
    }
    scoreCards() {
        this.tableCards.forEach(card => {
            const value = this.getCardValue(card)
            if (value == 'A' || value == '10') {
                this.teams[this.cutBy % 2].score++
            }
        })
    }
    setRestingTime(seconds) {
        this.time = this.turnTime - this.second * seconds
        this.timerType = 2
    }
    wontCut() {
        this.setTime(0)
        this.io.to(this.code).emit('willCut', { show: false })
    }
    setTime(msLeft) {
        this.time = this.turnTime - msLeft
    }
    getCardSuit(card) {
        return card.substr(0, 1)
    }
    getCardValue(card) {
        let value = card.substr(1, 1)
        if (value == '1') value = '10'
        return value
    }
    resetRoom(io, code, owner) {
        this.io = io
        this.code = code
        this.owner.username = owner.username
        this.owner.id = owner.id
        this.owner.avatar = owner.avatar
        this.playerCount = 2
        this.players = [
            /*{
                id: 'UID1628609875245',
                username: 'Nigga',
                avatar: '1628621108219.jpg',
                socket: 'CMdfcddGDvJ7QV0NAAAD',
            },*/
            {
                id: 'UID111',
                username: 'BOT Nicu',
                avatar: 'nicu.jpg',
                socket: '111'
            },
            {
                id: 'UID222',
                username: 'BOT Maria',
                avatar: '1629465283721.jpg',
                socket: '222'
            }
        ]
        this.resetGame()
    }
    resetGame() {
        this.state = 0
        this.readyCount = 2
        this.teams = [
            {
                members: [/*{
                    id: 'UID1628609875245',
                    username: 'Nigga',
                    avatar: '1628621108219.jpg',
                    socket: 'CMdfcddGDvJ7QV0NAAAD',
                    cards: []
                },*/
                    {
                        id: 'UID111',
                        username: 'BOT Nicu',
                        avatar: 'nicu.jpg',
                        socket: '111',
                        cards: []
                    }], score: 0, shortname: 'diamond'
            },
            {
                members: [
                    {
                        id: 'UID222',
                        username: 'BOT Maria',
                        avatar: '1629465283721.jpg',
                        socket: '222',
                        cards: []
                    }], score: 0, shortname: 'club'
            }
        ]
        this.cards = ['00', 'CA', 'C7', 'C8', 'C9', 'C10', 'CJ', 'CQ', 'CK', 'DA', 'D7', 'D8', 'D9', 'D10', 'DJ', 'DQ', 'DK', 'HA', 'H7', 'H8', 'H9', 'H10', 'HJ', 'HQ', 'HK', 'SA', 'S7', 'S8', 'S9', 'S10', 'SJ', 'SQ', 'SK']
        this.cardIndex = 0
        this.cardsInHand = 0
        this.tableCards = []

        this.timerType = 1
        this.time = 0
        this.turnCount = 0
        this.setCount = 0
        this.roundCount = 0

        this.currentPlayer = -1
        this.playedThisTurn = false
        this.base = {
            player: 0,
            card: '00'
        }
        this.cutBy = 0
        this.askToCut = false

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
    }

}
module.exports = { Game, gameHandler }