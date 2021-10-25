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
    second = 1000
    turnTime = this.second * 7
    time = 0

    turnCount = 0
    currentPlayer = -1
    playedThisTurn = false
    lastCard = '00'
    streak = 0

    cards = ['C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'CA', 'CJ', 'CQ', 'CK', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'DA', 'DJ', 'DQ', 'DK', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10', 'HA', 'HJ', 'HQ', 'HK', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'SA', 'SJ', 'SQ', 'SK']
    deck = []
    table = []

    gameInterval = null

    start() {
        console.log('start')
        this.resetGame()

        this.state = 1

        this.shuffleArray(this.deck)
        this.startGameInterval()

        this.dealCards(5)
        this.players.forEach(player => {
            console.log(player.cards)
        })
    }
    gameLoop = () => {
        if (this.state != 1) {
            this.resetGameInterval()
            return
        }
        if (this.time % this.second == 0) {

            if (this.time % this.turnTime == 0) {
                this.newTurn()
            }

            this.newSecond()
        }
        this.time += this.step
    }

    newSecond = () => {
        const secondsLeft = (this.turnTime - this.time % this.turnTime) / this.second
        const turnSeconds = this.turnTime / this.second
        this.io.to(this.code).emit('newSecond', ({ secondsLeft, turnSeconds }))
    }
    newTurn = () => {
        if (this.playedThisTurn == false && this.turnCount != 0){
            this.forcePlay()
        }
        
        this.currentPlayer = (this.currentPlayer + 1) % this.playerCount
        while (this.players[this.currentPlayer].state != 2) {
            this.currentPlayer = (this.currentPlayer + 1) % this.playerCount
        }


        this.playedThisTurn = false
        this.turnCount++

        this.io.to(this.code).emit('newTurn', { currentPlayer: this.currentPlayer })
        this.io.to(this.players[this.currentPlayer].socket).emit('myTurn')
    }
    dealCards = (number) => {
        for (let i = 0; i < number; i++) {
            this.players.forEach(player => {
                if (player.state == 2)
                    player.cards.push(this.deck.pop())
            })
        }
        this.players.forEach(player => {
            this.io.to(player.socket).emit('dealCards', { cards: player.cards })
        })
    }

    drawCard(playerIndex) {
        if (playerIndex != this.currentPlayer || this.playedThisTurn == true) return

        this.players[playerIndex].cards.push(this.deck.pop())
        this.playedThisTurn = true

        let player = this.players[playerIndex]
        this.io.to(player.socket).emit('updateHand', { handCards: player.cards })
    }

    playCard(card, playerIndex) {
        //If it's their turn
        if (playerIndex != this.currentPlayer || this.playedThisTurn == true) return

        let player = this.players[playerIndex]
        const cardIndex = player.cards.indexOf(card)

        //If he has that card
        if (cardIndex > -1) {

            //Play card
            this.table.push(this.players[playerIndex].cards.splice(cardIndex, 1)[0])
            this.playedThisTurn = true
            this.lastCard = this.table[this.table.length - 1]

            this.updateTable()
            this.updateHand(player.socket, this.players[playerIndex].cards)
        }
    }
    getBestCard(playerIndex) {
        //DE REFACUT FUNCTIA PT CAZURILE IN CARE UN JUCATOR DA A/2/J, AL DOILEA JUCATOR REACT IAR AL TREILEA NU VA MAI TREBUI
        if (playerIndex == -1) return 'prima'
        //Returns the best strategy for a forced play
        const player = this.players[playerIndex]

        const baseSuit = this.getCardSuit(this.lastCard)
        const baseValue = this.getCardValue(this.lastCard)
        let card

        if (baseValue == '0') {
            return player.cards[0]
        }
        else if (baseValue == 'A') {
            card = this.getCardWithValue(player.cards, 'A')
            if (card != undefined) return card
            else return 'wait'
        }
        else if (baseValue == '2' || baseValue == 'J') {

            card = this.getCardWithValue(player.cards, '2')
            if (card == undefined) card = this.getCardWithValue(player.cards, 'J')

            if (card != undefined) return card
            else if(this.streak != 0) return 'take'
            else return 'draw'
        }
        else {
            card = this.getCardWithValue(player.cards, baseValue)
            if (card == undefined) card = this.getCardWithSuit(player.cards, baseSuit)

            if (card != undefined) return card
            else return 'draw'
        }
    }
    getCardWithValue(cards, value) {
        return cards.filter(card => {
            if (this.getCardValue(card) == value)return true
            else return false 
        })[0]
    }
    getCardWithSuit(cards, suit) {
        return cards.filter(card => {
            if (this.getCardSuit(card) == suit)return true
            else return false 
        })[0]
    }
    forcePlay() {
        let card = this.getBestCard(this.currentPlayer)
        console.log('force play', card)
        if (card == 'draw') {

        }
        else if(card == 'wait'){

        }
        else if(card == 'take'){
            
        }
        else{
            this.playCard(card, this.currentPlayer)
        }
        
    }
    updateTable() {
        this.io.to(this.code).emit('updateTable', { tableCards: this.table })
    }
    updateHand(socket, cards) {
        this.io.to(socket).emit('updateHand', { handCards: cards })
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
        this.resetGameInterval()

        this.deck = this.cards.splice(0)
        this.table = []
        this.players.forEach(player => {
            player.cards.splice(0)
        })

        this.turnCount = 0
        this.currentPlayer = -1
    }
    setPlayersUnready() {
        this.players.forEach(player => {
            player.state = 1
        })
        this.readyCount = 0
        this.io.to(this.code).emit('getReady', { ready: false })
    }
    shuffleArray(array) {
        for (let i = 1; i < array.length; i++) {
            const random = (Math.ceil(Math.random() * 100000)) % array.length
            const aux = array[i]
            array[i] = array[random]
            array[random] = aux
        }
    }
    getCardSuit(card) {
        return card.substr(0, 1)
    }
    getCardValue(card) {
        let value = card.substr(1, 1)
        if (value == '1') value = '10'
        return value
    }
}
module.exports = Game