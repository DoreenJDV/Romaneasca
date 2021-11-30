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
    playerCount = 1
    players = [
        {
            socket: '',
            id: '',
            username: 'BOT Maria',
            avatar: '1629465283721.jpg',
            cards: [],
            connected: true,
            state: 2
        }
        // ,{
        //     socket: '',
        //     id: '',
        //     username: 'BOT Nicu',
        //     avatar: 'nicu.jpg',
        //     cards: [],
        //     connected: true,
        //     state: 2
        // }
    ]
    readyCount = 1

    winList = []
    disconnectedList = []

    step = 50
    second = 1000
    turnTime = this.second * 7
    time = 0

    turnCount = 0
    currentPlayer = -1
    
    //flags
    lastCard = '00'
    playedThisTurn = false
    lastCardActive = false
    streak = 0
    suit = 'C' //must be change on start

    cards = ['C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'CA', 'CJ', 'CQ', 'CK', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'DA', 'DJ', 'DQ', 'DK', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10', 'HA', 'HJ', 'HQ', 'HK', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'SA', 'SJ', 'SQ', 'SK']
    deck = []
    table = []
    tableMask = []

    gameInterval = null
    endInterval = null
    endTime = this.second * 30

    start() {
        this.resetGame()

        this.state = 1

        this.shuffleArray(this.deck)
        this.startGameInterval()

        this.dealCards(5)
        this.playBaseCard()
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
        this.time += this.step * 2
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

        const count = this.getRemainingPlayerCount()
        if (count < 2) {
            this.endGame()
            return
        }
        this.currentPlayer = (this.currentPlayer + 1) % this.playerCount
        while (this.players[this.currentPlayer].state != 2 || this.players[this.currentPlayer].connected == false) {
            this.currentPlayer = (this.currentPlayer + 1) % this.playerCount
        }

        this.playedThisTurn = false
        this.turnCount++

        this.io.to(this.code).emit('newTurn', { currentPlayer: this.currentPlayer })

        const cmd = this.getStrategy().command
        let drawCard = 0
        let giveUp = 0
        if(cmd == 'play' || cmd == 'draw') drawCard = 1
        if(cmd == 'fight' || cmd == 'lose' || cmd == 'wait' || cmd == 'go') giveUp = 1
        this.io.to(this.players[this.currentPlayer].socket).emit('myTurn',{drawCard, giveUp})
    }
    playBaseCard() {
        this.table.push(this.deck.pop())
        this.tableMask.push(this.table[0])
        this.lastCard = this.table[0]
        this.lastCardActive = false
        this.playedThisTurn = true
        this.suit = this.getCardSuit(this.lastCard)
        this.updateTable(this.table)
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

    playCard(card, playerIndex, newSuit = 0) {
        if(newSuit == 0)
        newSuit = this.getCardSuit(card)
        

        //If it's their turn
        if (playerIndex != this.currentPlayer || this.playedThisTurn == true) return

        let player = this.players[playerIndex]
        const cardIndex = player.cards.indexOf(card)
        //If he has that card
        if (cardIndex > -1) {
            

            const strategy = this.getStrategy()
            
            if (strategy.command == 'draw' || strategy.command == 'lose' || strategy.command == 'wait') {
                //Can't play any cards
                return
            }
            else {
                //Play the right card
                //strategy = [possible cards]  
                if (!strategy.cards.includes(card)) return
            }

            //A CARD WILL BE PLAYED FROM NOW ON

            
            const suit = this.getCardSuit(card)
            const value = this.getCardValue(card)
            
            this.suit = suit
            this.lastCardActive = false
            
            
            if (value == '7') {
                this.suit = newSuit
                // the suit7 card will be played, but it will be shown as newSuit7
            }
            else if (value == '2' || value == 'J') {
                this.lastCardActive = true
                this.streak += 1
            }
            else if (value == 'A') {
                this.lastCardActive = true
            }
            if (value != '2' && value != 'J') this.streak = 0

            
            this.table.push(this.players[playerIndex].cards.splice(cardIndex, 1)[0])

            //Masking the 7 card
            if(value == '7' && card[1] == '7'){
                const newSeven = ''+newSuit+'7'
                this.tableMask.push(newSeven)
            }
            else{
                this.tableMask.push(card)
            }

            this.playedThisTurn = true
            this.lastCard = this.table[this.table.length - 1]


            //recycle played cards:
            while (this.table.length > 3) {
                this.deck.push(this.table.shift())
                this.tableMask.shift()
            }
            this.shuffleArray(this.deck)


            if (this.players[this.currentPlayer].cards.length == 0) {
                this.winGame(this.currentPlayer)
            }
            
            this.updateTable(this.tableMask)
            this.updateHand(player.socket, this.players[playerIndex].cards)
            this.updateCardCount()
            this.endTurn()
        }
    }
    playCard7(card,newSuit, playerIndex) {
        
        this.playCard(card, playerIndex, newSuit)
    }
    endTurn() {
        this.time = this.turnTime
    }
    winGame(playerIndex) {
        const player = this.players[playerIndex]
        player.state = 3
        this.winList.push(player)
    }
    drawCard(playerIndex) {
        if (playerIndex != this.currentPlayer || this.playedThisTurn == true) return

        const strategy = this.getStrategy()
        const cmd = strategy.command
        if (!(cmd == 'draw' || cmd == 'play')) return

        this.players[playerIndex].cards.push(this.deck.pop())
        this.playedThisTurn = true

        let player = this.players[playerIndex]
        this.updateHand(player.socket, player.cards)
        this.updateCardCount()
        this.endTurn()
    }
    giveUp(playerIndex){
        if (playerIndex != this.currentPlayer || this.playedThisTurn == true) return
        const strategy = this.getStrategy()
        const cmd = strategy.command

        if(cmd == 'fight' || cmd == 'lose'){
            this.loseFight()
        }
        if(cmd == 'wait' || cmd == 'go'){
            this.waitTurn()
        }
    }
    loseFight() {
        //Losing a fight (not having a '2' or 'J')
        this.lastCardActive = false
        this.playedThisTurn = true

        const player = this.players[this.currentPlayer]
        for (let i = 0; i < this.streak * 2; i++) {
            player.cards.push(this.deck.pop())
        }
        this.streak = 0
        this.updateHand(player.socket, player.cards)
        this.updateCardCount()
        this.endTurn()
    }
    waitTurn() {
        //wait this turn (not having an 'A')
        this.lastCardActive = false
        this.playedThisTurn = true
        this.endTurn()
    }

    forcePlay() {
        const strategy = this.getStrategy()

        if (strategy.command == 'draw') {
            this.drawCard(this.currentPlayer)
        }
        else if (strategy.command == 'lose') {
            this.loseFight()
        }
        else if (strategy.command == 'wait') {
            this.waitTurn()
        }
        else {
            //can play
            this.playCard(strategy.cards[0], this.currentPlayer)
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
        let baseSuit = this.suit
        const demand = this.getDemand()

        let strategy={}

        if (demand == 'fight') {
            const card2 = this.hasValue('2')
            const cardJ = this.hasValue('J')

            if (card2.length > 0 || cardJ.length > 0) {
                strategy.command = 'fight'
                strategy.cards =  card2.concat(cardJ)
            }
            else {
                strategy.command = 'lose'
                strategy.cards = []
            }
        }
        else if (demand == 'wait') {
            const cards = this.hasValue('A')
            if (cards.length > 0) {
                strategy.command = 'go'
                strategy.cards =  cards
            }
            else{
                strategy.command = 'wait'
                strategy.cards = []
            }
        }
        else if (demand == 'play') {
            
            const cardSuit = this.hasSuit(baseSuit)
            const cardValue = this.hasValue(baseValue)
            const card7 = this.hasValue('7')

            if (cardSuit.length > 0 || cardValue.length > 0 || card7.length > 0){
                strategy.command = 'play'
                strategy.cards = cardSuit.concat(cardValue).concat(card7)
            }
            else {
                strategy.command = 'draw'
                strategy.cards = []
            }
        }
        return strategy
    }

    updateTable(tableCards) {
        this.io.to(this.code).emit('updateTable', { tableCards })
    }
    updateHand(socket, cards) {
        this.io.to(socket).emit('updateHand', { handCards: cards })
    }

    updateCardCount() {
        const playersState = this.players.map(player => {
            return {
                connected: player.connected,
                state: player.state,
                cardCount: player.cards.length
            }
        })
        this.io.to(this.code).emit('updateCardCount', { playersState })
    }

    endGame() {
        this.resetGameInterval()
        this.state = 3
        //win
        // this.players.forEach(player => {
        //     if (!this.winList.includes(player)) {
        //         this.winList.push(player)
        //     }
        // })

        let loser = this.players.filter(player => {
            return player.connected == true && player.state == 2
        })

        console.log('winners',this.winList)
        console.log('loser', loser)
        console.log('disconnected', this.disconnectedList)

        let leaderboard = this.winList.concat(loser)
        leaderboard = leaderboard.concat(this.disconnectedList)

        setTimeout(()=>{
            this.io.to(this.code).emit('endGame', { leaderboard })
            this.startEndInterval()
        },3000)
    }

    startGameInterval() {
        this.resetGameInterval()
        this.gameInterval = setInterval(this.gameLoop, this.step)
    }
    resetGameInterval() {
        clearInterval(this.gameInterval)
        this.time = 0
    }

    endLoop = () =>{
        if(this.endTime <= 0){
            this.resetGame()
            this.resetRoom()
            this.resetEndInterval()
            return 
        }
        this.io.to(this.code).emit('endSeconds', {secondsLeft: this.endTime / this.second})

        this.endTime -= 1000
    }
    startEndInterval(){
        this.resetEndInterval()
        this.endInterval = setInterval(this.endLoop, 1000)
    }
    resetEndInterval(){
        clearInterval(this.endInterval)
        this.endTime = 30 * this.second
    }

    resetGame() {
        this.resetGameInterval()
        this.resetEndInterval()

        this.deck = this.cards.slice(0)
        this.table = []
        this.tableMask = []

        this.players.forEach(player => {
            player.cards.splice(0)
        })

        this.turnCount = 0
        this.currentPlayer = -1
        this.lastCard = '00'
        this.lastCardActive = false
        this.winList = []
    }
    resetRoom(){
        this.removeDisconnectedPlayers()

        this.io.to(this.code).emit('resetRoom')
        this.io.to(this.code).emit('refreshWaitingScreen', {players:this.players, maxPlayerCount: this.utils.maxPlayerCount})
    }
    removeDisconnectedPlayers(){
        this.players = this.players.filter(player => {
            return player.connected != 0
        })

        //remember to remove this
        this.players.forEach(player => {
            player.state = 2
        })

        //this.setPlayersUnready() <- uncomment this 
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
    getRemainingPlayerCount() {

        return this.players.filter(player => player.connected == true && player.state == 2).length
    }
}
module.exports = Game