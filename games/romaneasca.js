class Game {
    utils = {
        cardsInHand: 4,
        cardCount: 32,
        maxPlayerCount: 4
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
        { members: [], score: 0, shortname: 'diamond', name: 'Diamonds' },
        { members: [], score: 0, shortname: 'club', name: 'Clubs' }
    ]
    readyCount = 0

    second = 1000
    step = 100
    turnTime = this.second * 10
    restTime = this.second * 3
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

    gameInterval 
    start() {
        //REMOVE MEMBER SWITCH !!!
        this.state = 1
        this.shuffleCards(this.cards)
        this.fillCards()

        this.io.to(this.code).emit('clearChat')
        this.io.to(this.code).emit('chatAnnouncement', {message: `Game started on room ${this.code}`})
        this.startLoop()
    }
    startLoop(){
        clearInterval(this.gameInterval)
        this.gameInterval = setInterval(this.gameLoop, this.step)
    }
    gameLoop = () => {
        //STOP GAME BY FORCE
        if (this.state == 0) {
            this.stop()
            return
        }
        if (this.state == 2) {
            clearInterval(this.gameInterval)
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

        if (this.time % this.second == 0) {
            this.newSecond()
        }
        this.time += this.step
    }
    //SECONDS
    newSecond() {
        const timeLeft = (this.turnTime - this.time % this.turnTime) / this.second
        let maxTime
        if (this.timerType == 1) maxTime = this.turnTime / this.second
        else if (this.timerType == 2) maxTime = this.restTime / this.second
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
        }
        //New turn
        this.turnCount++;
        this.currentPlayer = (this.currentPlayer + 1) % 4
        this.playedThisTurn = false

        this.io.to(this.code).emit('willCut', { show: false })
    }
    newTurn() {
        this.timerType = 1
        const team = this.currentPlayer % 2
        const member = Math.floor(this.currentPlayer / 2)
        this.io.to(this.code).emit('newTurn', { turnCount: this.turnCount, currentPlayer: { team, member }})
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
            this.setRestingTime()
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

    endInterval
    endSeconds

    end() {
        clearInterval(this.gameInterval)
        this.state = 3

        const score0 = this.teams[0].score
        const score1 = this.teams[1].score
        const score = [score0, score1]

        let winner
        if (score0 > score1) winner = 0
        else if (score1 > score0) winner = 1
        else winner = -1

        const teams = this.teams.map(team => {
            return {
                members: team.members.map(member => {
                    return { username: member.username, avatar: member.avatar }
                }), score: team.score, short: team.shortname, name: team.name
            }
        })

        this.io.to(this.code).emit('gameEnd', { winner, score, teams })

        this.resetEndInterval()
        this.endInterval = setInterval(()=>{

            if(this.endSeconds < 0){
                this.resetEndInterval()
                this.resetGame()
                this.io.to(this.code).emit('reload')
                return
            }

            this.io.to(this.code).emit('endSeconds', {endSeconds: this.endSeconds})
            this.endSeconds--
        }, 1000)
        
    }
    resetEndInterval(){
        clearInterval(this.endInterval)
        this.endSeconds = 30
    }

    stop() {
        this.resetPauseInterval()
        this.clearInterval(this.gameInterval)
        this.io.to(this.code).emit('chatAnnouncement', { message: `Game stopped unexpectedly` })
        this.io.to(this.code).emit('gameStop')
    }

    pauseInterval = null
    pauseSeconds = 30

    pause() {
        this.state = 2

        if(this.pauseInterval == null){ //First time
            this.pauseInterval = setInterval(()=>{
                if(this.pauseSeconds < 0){
                    //STOP THE GAME
                   this.resetPauseInterval()

                    this.state = 0
                    this.removeDisconnectedPlayers()
                    this.removeDisconnectedMembers()
                    this.resetGame()
                    this.io.to(this.code).emit('reload')
                    return
                }

                this.io.to(this.code).emit('pauseSeconds', {pauseSeconds: this.pauseSeconds})
                this.pauseSeconds--
            }, 1000)
        }
    }
    unPause() {
        this.state = 1
        this.io.to(this.code).emit('unpause')
        this.io.to(this.code).emit('gameStarted', {teams: this.teams})

        this.resetPauseInterval()
        this.startLoop()
    }
    resetPauseInterval(){
        clearInterval(this.pauseInterval)
        this.pauseInterval = null
        this.pauseSeconds = 30
    }
    shuffleCards(cards) {
        for (let i = 1; i < cards.length; i++) {
            const random = (Math.ceil(Math.random() * 100000)) % this.utils.cardCount + 1
            const aux = cards[i]
            cards[i] = cards[random]
            cards[random] = aux
        }
    }
    fillCards() {
        const number = Math.min(this.utils.cardsInHand - this.cardsInHand, Math.floor((this.utils.cardCount - this.cardIndex) / 4))
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
                }
                //CHECK IF CUT
                else if (this.getCardValue(this.base.card) == this.getCardValue(card) || this.getCardValue(card) == '7') {
                    this.cutBy = this.currentPlayer
                    isCut = true
                }
                if (!isCut && this.askToCut == true) {  //ForcePlay: Daca poate taia, dar prima carte nu e taietura
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
    setRestingTime() {
        this.time = this.turnTime - this.restTime
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
    removeDisconnectedPlayers(){
        this.players = this.players.filter(player => {
            return player.connected == true
        })
        this.playerCount = this.players.length
    }
    removeDisconnectedMembers(){
        this.teams.forEach(team => {
            team.members.filter(member => member.connected)
        })
    }
    resetRoom(io, code, owner) {
        this.io = io
        this.code = code
        this.owner.username = owner.username
        this.owner.id = owner.id
        this.owner.avatar = owner.avatar
        this.playerCount = 2
        this.players = [
            {
                id: 'UID111',
                username: 'BOT Nicu',
                avatar: 'nicu.jpg',
                socket: '111',
                connected: true
            },
            {
                id: 'UID222',
                username: 'BOT Maria',
                avatar: '1629465283721.jpg',
                socket: '222',
                connected: true
            }
        ]
        this.resetGame()
    }
    resetGame() {
        clearInterval(this.gameInterval)
        clearInterval(this.pauseInterval)

        this.state = 0
        this.readyCount = 2
        this.teams = [
            {
                members: [
                    {
                        id: 'UID111',
                        username: 'BOT Nicu',
                        avatar: 'nicu.jpg',
                        socket: '111',
                        connected: true,
                        cards: []
                    }], score: 0, shortname: 'diamond', name: 'Diamonds'
            },
            {
                members: [
                    {
                        id: 'UID222',
                        username: 'BOT Maria',
                        avatar: '1629465283721.jpg',
                        socket: '222',
                        connected: true,
                        cards: []
                    }], score: 0, shortname: 'club', name: 'Clubs'
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
        this.forceTurnEnd = false

        this.io.to(this.code).emit('clearTable')
        this.io.to(this.code).emit('clearHand')
        this.io.to(this.code).emit('clearChat')
    }

}
module.exports = Game