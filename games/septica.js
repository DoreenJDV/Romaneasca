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
    winList = []

    step = 50
    second = 1000
    turnTime = this.second * 7
    time = 0

    turnCount = 0
    currentPlayer = -1
    playedThisTurn = false
    lastCard = '00'
    //flags
    lastCardActive = false
    streak = 0
    suit = 'C' //must be change on start

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
        this.playBaseCard()
        // this.players.forEach(player => {
        //     console.log(player.cards)
        // })
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
        this.time += 2 *this.step
    }

    newSecond = () => {
        const secondsLeft = (this.turnTime - this.time % this.turnTime) / this.second
        const turnSeconds = this.turnTime / this.second
        this.io.to(this.code).emit('newSecond', ({ secondsLeft, turnSeconds }))
    }
    newTurn = () => {
        if (this.playedThisTurn == false && this.turnCount != 0) {
            this.forcePlay()
        }

        const count = this.getPlayerCountByState(2)
        console.log(count)
        if(count < 2){
            this.endGame()
            return
        }
        //INFO
        console.log('\nNew Turn')
        this.players.forEach(player => {
            console.log(player.cards)
        })
        console.log('Last card active', this.lastCardActive)
        console.log('Streak', this.streak)
        console.log('Suit', this.suit)

        this.currentPlayer = (this.currentPlayer + 1) % this.playerCount
        while (this.players[this.currentPlayer].state != 2) {
            this.currentPlayer = (this.currentPlayer + 1) % this.playerCount
        }


        this.playedThisTurn = false
        this.turnCount++

        this.io.to(this.code).emit('newTurn', { currentPlayer: this.currentPlayer })
        this.io.to(this.players[this.currentPlayer].socket).emit('myTurn')
    }
    playBaseCard() {
        this.table.push(this.deck.pop())
        this.lastCard = this.table[0]
        this.lastCardActive = false
        this.playedThisTurn = true
        this.suit = this.getCardSuit(this.lastCard)
        this.updateTable()
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

    playCard(card, playerIndex) {
        //If it's their turn
        if (playerIndex != this.currentPlayer || this.playedThisTurn == true) return
        
        let player = this.players[playerIndex]
        const cardIndex = player.cards.indexOf(card)

        //If he has that card
        if (cardIndex > -1) {

            const strategy = this.getStrategy()

            if (strategy == 'draw' || strategy == 'lose' || strategy == 'wait') {
                //Can't play any cards
                return
            }
            else {
                //Play the right card
                //strategy = [possible card]

                if(!strategy.includes(card)) return
            }

            //A CARD WILL BE PLAYED FROM NOW ON
            const suit = this.getCardSuit(card)
            const value = this.getCardValue(card)
            
            this.suit = suit
            this.lastCardActive = false
            
            
            if(value == '7'){
                this.suit = suit
                //ADD AN INTERFACE FOR CHOOSING OTHER SUIT
            }
            else if(value == '2' || value == 'J'){
                this.lastCardActive = true
                this.streak += 1 
            }
            else if(value == 'A'){
                this.lastCardActive = true
            }
            if(value != '2' && value != 'J') this.streak = 0
            


            this.table.push(this.players[playerIndex].cards.splice(cardIndex, 1)[0])
            this.playedThisTurn = true
            this.lastCard = this.table[this.table.length - 1]
            

            //recycle played cards:
            while (this.table.length > 3){
                this.deck.push(this.table.shift())
            }
            this.shuffleArray(this.deck)

            
            if(this.players[this.currentPlayer].cards.length == 0){
                this.winGame(this.currentPlayer)
            }

            this.updateTable()
            this.updateHand(player.socket, this.players[playerIndex].cards)
            this.updateCardCount()
            this.endTurn()
        }
    }
    
    endTurn(){
        this.time = this.turnTime

    }
    winGame(playerIndex){
        const player = this.players[playerIndex]
        player.state = 3
        this.winList.push(player)
    }
    drawCard(playerIndex) {
        if (playerIndex != this.currentPlayer || this.playedThisTurn == true) return
        
        if(this.getStrategy() != 'draw') return

        this.players[playerIndex].cards.push(this.deck.pop())
        this.playedThisTurn = true

        let player = this.players[playerIndex]
        this.updateHand(player.socket,player.cards)
        this.updateCardCount()
        this.time = this.turnTime
    }
    loseFight(){
        //Losing a fight (not having a '2' or 'J')
        this.lastCardActive = false

        const player = this.players[this.currentPlayer]
        for(let i = 0; i <this.streak*2;i++){
            player.cards.push(this.deck.pop())
        }
        this.streak = 0
        this.updateHand(player.socket,player.cards)
        this.updateCardCount()
    }
    waitTurn(){
        //wait this turn (not having an 'A')
        this.lastCardActive = false
    }

    forcePlay() {
        const strategy = this.getStrategy()

        if (strategy == 'draw') {
            console.log('draw')
            this.drawCard(this.currentPlayer)
        }
        else if (strategy == 'lose') {
            console.log('lose')
            this.loseFight()
        }
        else if (strategy == 'wait') {
            console.log('wait')
            this.waitTurn()
        }
        else {
            //can play
            this.playCard(strategy[0], this.currentPlayer)
        }
    }
    
    getDemand() {
        const baseValue = this.getCardValue(this.lastCard)
        const baseSuit = this.getCardSuit(this.lastCard)

        if (this.lastCardActive && (baseValue == 'J' || baseValue == '2')) return 'fight'
        else if (this.lastCardActive && baseValue == 'A') return 'wait'
        else return 'play'
    }

    getStrategy() {
        //Returns the strategy (the cards that can be played or a messsage(call to action))
        const baseValue = this.getCardValue(this.lastCard)
        let baseSuit = this.getCardSuit(this.lastCard)
        const demand = this.getDemand()
        
        if (demand == 'fight') {
            const card2 = this.hasValue('2')
            const cardJ = this.hasValue('J')

            if (card2.length > 0 || cardJ.length > 0) return card2.concat(cardJ)
            else return 'lose'
        }
        else if (demand == 'wait') {
            const card = this.hasValue('A')
            if (card.length > 0) return card
            else return 'wait'
        }
        else if (demand == 'play') {
            if (baseValue == '7') baseSuit = this.suit
            
            const cardSuit = this.hasSuit(baseSuit)
            const cardValue = this.hasValue(baseValue)
            const card7 = this.hasValue('7')

            if (cardSuit.length > 0 || cardValue.length > 0 || card7.length > 0)
            return cardSuit.concat(cardValue).concat(card7)
            else return 'draw'
        }
    }

    updateTable() {
        this.io.to(this.code).emit('updateTable', { tableCards: this.table })
    }
    updateHand(socket, cards) {
        this.io.to(socket).emit('updateHand', { handCards: cards })
    }
    
    updateCardCount() {
        const playersState = this.players.map(player => {
            return{
                state: player.state,
                cardCount: player.cards.length
            }
        })
        this.io.to(this.code).emit('updateCardCount', { playersState })
    }
    
    endGame(){
        this.resetGameInterval()
        this.state = 3
        //win
        this.players.forEach(player => {
            if (!this.winList.includes(player)){
                this.winList.push(player)
            }
        })

        this.io.to(this.code).emit('endGame', {winList: this.winList})
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
        this.lastCard = '00'
        this.lastCardActive = false
        this.winList = []
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
    hasSuit(suit) {
        const player = this.players[this.currentPlayer]
        return player.cards.filter(card => this.getCardSuit(card) == suit)
    }
    hasValue(value) {
        const player = this.players[this.currentPlayer]
        return player.cards.filter(card => this.getCardValue(card) == value)
    }
    getCardSuit(card) {
        return card.substr(0, 1)
    }
    getCardValue(card) {
        let value = card.substr(1, 1)
        if (value == '1') value = '10'
        return value
    }
    getPlayerCountByState(state){
        return this.players.filter(player => player.state == state).length
    }
}
module.exports = Game