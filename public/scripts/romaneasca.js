const socket = io({
    closeOnBeforeunload: false
})
window.onbeforeunload = e => {}
const data = document.getElementById('data')
let user
let code

// <Sound>
turnOnSound = () => {
    soundOn = 1
    turnSoundRequest(1)
    
    document.querySelector('.top .sound .sound-on').classList.remove('hidden')
    document.querySelector('.top .sound .sound-off').classList.add('hidden')

}
turnOffSound = () => {
    soundOn = 0
    turnSoundRequest(0)

    document.querySelector('.top .sound .sound-on').classList.add('hidden')
    document.querySelector('.top .sound .sound-off').classList.remove('hidden')
}

turnSoundRequest = (on) => {
    fetch('/profile/turnSound', {
        method: 'POST',
        headers: {
            'Content-TYpe': 'application/json'
        },
        body: JSON.stringify({
            sound: on
        })
    })
}

let soundOn = data.getAttribute('sound') != '0'

let volume = 0.1

const sounds = {
    clockTick: document.getElementById('clockTick'),
    whoosh1: document.getElementById('whoosh1'),
    whoosh2: document.getElementById('whoosh2'),
    ding: document.getElementById('ding'),
    winner: document.getElementById('winner')
}
Object.entries(sounds).forEach(sound => {
    sound[1].volume = volume
})
// </Sound>


//  <Connect to room>
async function connectSocket() {
    const user_ = await (await fetch('/getuser')).json()
    user = user_
    const code_ = data.getAttribute('code')
    code = code_
    socket.emit('connectedToGame', { user, code: code.toString() })
}
connectSocket()

socket.on('refreshPlayerList', ({ players, playerCount }) => {
    const playersContainer = document.querySelectorAll('#waiting-screen .players')[0]
    playersContainer.innerHTML = ''
    players.forEach(player => {
        playersContainer.insertAdjacentHTML('beforeend', renderPlayer(player))
    })
})
function renderPlayer(player) {
    return `
    <div class="player flex-row">
        <div class="image"><img src="../../public/data/avatars/${player.avatar}" alt=""></div>
        <div class="username">${player.username}</div>
    </div>`
}
//  </Connect to room>


//  <Choose team>
function chooseTeam(number) {
    socket.emit('chooseTeam', { team: number, user, code })
}
socket.on('refreshTeamMembers', ({ teams, readyCount }) => {
    refreshTeamMembers(teams)
    const readyCountContainer = document.querySelector('.ready .ready-count')
    readyCountContainer.innerHTML = `Players ready: ${readyCount}/4`
})
function refreshTeamMembers(teams) {
    for (let i = 0; i < 2; i++) {
        let teamMembersContainer = document.querySelector(`#waiting-screen [team="${i}"] .members`)
        teamMembersContainer.innerHTML = ''
        if (!teams) continue

        teams[i].members.forEach(member => {
            teamMembersContainer.insertAdjacentHTML('beforeend', renderTeamMember(member))
        })
    }
}
function renderTeamMember(member) {
    return `
    <div class="member flex-row">
        <div class="image fill-image"><img src="../../public/data/avatars/${member.avatar}" alt=""></div>
        <div class="username">${member.username}</div>
    </div>
    `
}
//  </Choose team>


// <Starting game>
const startingIn = document.querySelector('#waiting-screen .ready .starting-in')
socket.on('startingSeconds', ({ seconds }) => {
    startingIn.innerHTML = `Starting in ${seconds}s`
})
socket.on('startingGame', () => {
    startingIn.innerHTML = `Starting in 0s`
})
socket.on('startingGameStopped', () => {
    startingIn.innerHTML = `Waiting for players`
})

socket.on('gameStarted', ({ teams }) => {
    teams.forEach((team, i) => {
        team.members.forEach((member, j) => {
            document.querySelector(`main .player[team="${i}"][member="${j}"]`).innerHTML = 
            `
                <div class="image fill-image profile-picture"><img src="../../public/data/avatars/${member.avatar}" alt=""></div>
                <div class="username">${member.username}</div>
                <div class="image fit-image team-logo"><img src="../../public/res/images/${team.shortname}.svg" alt=""></div>
                <div class="fit-image cut hidden"><img src="../../public/res/images/magnet.svg" alt=""></div>
            `
        })
    })
    const waitingScreen = document.getElementById('waiting-screen')
    waitingScreen.style.display = 'none'
})
// </Starting game>

// <GAME>
socket.on('newSecond', ({ timeLeft, maxTime, timerType }) => {
    const secondBar = document.querySelector('.timer .bar .seconds')
    const progressBar = document.querySelector('.timer .bar .progress')

    secondBar.innerHTML = timeLeft
    progressBar.style.left = `-${(maxTime - timeLeft) / maxTime * 100}%`
    if (timeLeft < 6 && timerType == 1) {
        progressBar.style.backgroundColor = 'var(--second)'
        if (soundOn) { sounds.clockTick.play() }
    }
    else if (timerType == 2) {
        progressBar.style.backgroundColor = 'var(--warning)'
    }
    else progressBar.style.backgroundColor = 'var(--mainl)'
})

//TURNS AND ROUNDS
let round = 1, set = 1, turn = 1
function logTurn() {
    document.querySelector('.timer .round').innerHTML = `Round ${round},  Set ${set},  Turn ${turn}`
}
socket.on('newTurn', ({ turnCount, currentPlayer}) => {
    turn = turnCount
    logTurn()
    clearPlayerGlow()
    document.querySelector(`main .player[team="${currentPlayer.team}"][member="${currentPlayer.member}"]`).classList.add('glowing')

    disableCards()
})
socket.on('counts', ({roundCount, setCount, turnCount})=>{
    turn = turnCount
    set = setCount
    round = roundCount
    logTurn()
})
socket.on('newSet', ({ setCount }) => {
    set = setCount
})
socket.on('newRound', ({ roundCount, score }) => {
    round = roundCount
    clearTable()
    updateScore(score)
})
function updateScore(score) {
    score.forEach((point, i) => {
        document.querySelector(`.score [team='${i}'] .value`).innerHTML = point
    })
}
socket.on('myTurn', () => {
    const cards = document.querySelectorAll('.hand .card')
    cards.forEach(card => {
        card.classList.remove('gray')
    })
    if (soundOn) sounds.ding.play()
})
function clearPlayerGlow() {
    document.querySelectorAll('main .player').forEach(player => {
        player.classList.remove('glowing')
    })
}
function disableCards() {
    const cards = document.querySelectorAll('.hand .card')
    cards.forEach(card => {
        card.classList.add('gray')
    })
}
// Deal cards
socket.on('dealCards', ({ cards }) => {
    const hand = document.querySelector('.hand')
    clearHand()
    cards.forEach(card => {
        hand.insertAdjacentHTML('beforeend', renderHandCard(card))
        //sounds.whoosh1.play()
    })
})
function renderHandCard(card) {
    return ` 
    <div class="card-slot flex-row"> 
        <div class="card fill-image gray" onclick="playCard('${card}')"><img src="../../public/res/cards/${card}.png" alt="${card}"></div>
    </div>`
}
function clearHand() {
    const hand = document.querySelector('.hand')
    hand.innerHTML = ''
}
// Play card
function playCard(card) {
    socket.emit('playCard', { card })
}
socket.on('playCard', ({ cards, cutBy }) => {
    const table = document.querySelector('.table .cards')
    clearTable()
    cards.forEach(card => {
        table.insertAdjacentHTML('beforeend', renderTableCard(card))
    })
    clearPlayerCut()
    document.querySelector(`main .player[team="${cutBy % 2}"][member="${Math.floor(cutBy / 2)}"] .cut`).classList.remove('hidden')

    if (soundOn) {
        sounds.whoosh2.play()
    }
})
function renderTableCard(card) {
    return ` 
    <div class="card-slot flex-row"> 
        <div class="card"><img src="../../public/res/cards/${card}.png" alt="${card}"></div>
    </div>`
}
function clearTable() {
    const table = document.querySelector('.table .cards')
    table.innerHTML = ''
}
function clearPlayerCut() {
    document.querySelectorAll('main .player .cut').forEach(cut => {
        cut.classList.add('hidden')
    })
}
socket.on('willCut', ({ show }) => {
    const giveUp = document.querySelector('.bottom .give-up')

    if (show) giveUp.style.visibility = 'visible'
    else giveUp.style.visibility = 'hidden'
})
function doNotCut() {
    socket.emit('wontCut')
}

// </GAME>
// <Ending game>
socket.on('gameEnd', ({ winner, score, teams }) => {

    const endingScreen = document.getElementById('ending-screen')

    const secondBar = document.querySelector('.timer .bar .seconds')
    const progressBar = document.querySelector('.timer .bar .progress')

    updateScore(score)
    clearTable()
    secondBar.innerHTML = "Game Over"
    progressBar.style.left = "-101%"

    const endTitle = document.querySelector('#ending-screen .title')
    endTitle.innerHTML = renderEndTitle(winner, teams)

    const winners = document.querySelector('#ending-screen .winners')
    winners.innerHTML = ''
    if (winner != -1) {
        teams[winner].members.forEach(member => {
            winners.insertAdjacentHTML('beforeend', renderWinner(member))
        })
    }

    const scoreContainer = document.querySelector('#ending-screen .score')
    scoreContainer.innerHTML = renderScore(score)

    endingScreen.style.display = 'flex'
    if (soundOn) sounds.winner.play()

    const timer = document.querySelector('#ending-screen .timer')
    endSeconds = 30
    endLoop = setInterval(() => {
        if (endSeconds < 1) {
            clearInterval(endLoop)
            clearGame()
            return
        }
        timer.innerHTML = `Clearing the game in ${endSeconds}s`
        endSeconds--
    }, 1000)

})
function renderEndTitle(winner, teams) {
    if (winner == -1) return `
            <h1>Draw</h1>
        `

    let color
    if(winner ==0) color = 'var(--redTeam)'
    else color = 'var(--blackTeam)'

    return `
            <div class="logo fit-image"><img src="../../public/res/images/${teams[winner].short}.svg" alt=""></div>
                <h1>The <span class="team" style="color: ${color}">${teams[winner].name.toUpperCase()}</span> won</h1>
            <div class="logo fit-image"><img src="../../public/res/images/${teams[winner].short}.svg" alt=""></div>
        `
}
function renderWinner(member) {
    return `
        <div class="winner flex-row">
            <div class="crown fit-image"><img src="../../public/res/images/crown.svg" alt=""></div>
            <div class="image fill-image"><img src="../../public/data/avatars/${member.avatar}" alt=""></div>
            <div class="username">${member.username}</div>
        </div>`
}
function renderScore(score) {
    return `
            <div team="0">${score[0]}</div>
                <div class="dash">-</div>
            <div team="1">${score[1]}</div>
        `
}
function clearGame() {
    const endingScreen = document.getElementById('ending-screen')
    endingScreen.style.display = 'none'
    window.onbeforeunload = () => { }
    window.location.href = '/romaneasca'
}
// </Ending game>
// <Stop game>

socket.on('gameStop', () => {
    const secondBar = document.querySelector('.timer .bar .seconds')
    const progressBar = document.querySelector('.timer .bar .progress')

    secondBar.innerHTML = 'GAME STOPPED'
    progressBar.style.left = '-101%'
})

// </Stop game>
// <Pause game>

socket.on('pause', ({players})=>{
    const pauseScreen = document.getElementById('pause-screen')
    pauseScreen.style.display ='flex'

    const container = document.querySelector('#pause-screen .players')
    container.innerHTML = ''
    players.forEach(player => {
        container.insertAdjacentHTML('beforeend', renderPlayer(player))
    })
})
socket.on('unpause', ()=>{
    const pauseScreen = document.getElementById('pause-screen')
    pauseScreen.style.display ='none'
})
socket.on('pauseSeconds', ({pauseSeconds}) =>{
    const pauseTimer = document.querySelector('#pause-screen .info .seconds')
    pauseTimer.innerHTML = `${pauseSeconds}s`
})
// </Pause game>
// <Chat>
sendChat = () => {
    const chatForm = document.getElementById('chatForm')
    const formData = new FormData(chatForm)
    const message = formData.get('message')
    if (message.length > 0) {
        socket.emit('chat', { message, user, code })
    }
    const input = document.querySelector('#chatForm input')
    input.value = ''
    input.focus()
}

socket.on('chat', ({ message, user }) => {
    const messageContainer = document.querySelector('.chat .messages')
    messageContainer.insertAdjacentHTML('beforeend', renderMessage(message, user))
    messageContainer.scrollTo(0, messageContainer.scrollHeight)
})
socket.on('chatAnnouncement', ({ message }) => {
    const messageContainer = document.querySelector('.chat .messages')
    messageContainer.insertAdjacentHTML('beforeend', renderAnnouncement(`${message}`))
})

renderMessage = (message, user) => {
    return `
    <div class="message flex-row">
        <div class="user">${user.username}</div>
        <div class="text">${message}</div>
    </div>`
}
renderAnnouncement = (message) => {
    return `<div class="announcement"> ${message} </div>`
}
// </Chat>

// <PING>
let pongServer = 'pong'
pingInterval = setInterval(() => {
    if (pongServer != 'pong') {
        clearInterval(pingInterval)
        window.onbeforeunload = () => { }
        window.location = '/romaneasca'
    }
    pongServer = 'not pong'
    socket.emit('ping')
}, 5000)
socket.on('pong', () => {
    pongServer = 'pong'
})
// </PONG>

socket.on('backToRoot', () => {
    window.location.href = '../../'
})
socket.on('redirect', () =>{
    window.onbeforeunload = () => {}
    window.location.href = '../'
})
socket.on('reload', ()=>{
    window.onbeforeunload = () => {}
    location.reload()
})