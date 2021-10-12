window.onbeforeunload = e => ''
const socket = io('/septica', {
    closeOnBeforeunload: false
})

const data = document.getElementById('data')
const code = data.getAttribute('code')
const picturesOn = data.getAttribute('pictures') != '0'
const short = data.getAttribute('short')
let soundOn = data.getAttribute('sound') != '0'

let user
async function connectSocket() {
    user = await (await fetch('/getuser')).json()
    socket.emit('connectedToGame', { user, code: code.toString() })
}
connectSocket()


// <Waitign Screen>
socket.on('refreshWaitingScreen', ({ players, maxPlayerCount }) => {
    refreshWaitingScreen(players, maxPlayerCount)
    const readyCount = document.querySelector('.ready-control .ready-count')
    const readys = players.filter(player => {
        return player.state == 2
    }).length
    readyCount.innerHTML = `Players ready ${readys}/${players.length}`
})
function refreshWaitingScreen(players, maxPlayerCount) {
    const playerContainer = document.querySelector('#waiting-screen .players')
    playerContainer.innerHTML = ``

    players.forEach((player, index) => {
        playerContainer.insertAdjacentHTML('beforeend', renderWaitingPlayer(index, player))
    })

    for (let i = 0; i < maxPlayerCount - players.length; i++) {
        playerContainer.insertAdjacentHTML('beforeend', `<div class="player flex-row"></div>`)
    }
}
function renderWaitingPlayer(index, player) {
    return `
    <div class="player flex-row">
        <div class="index">${index + 1}</div>
        <div class="avatar fill-image"><img src="../../public/data/avatars/${player.avatar}" alt=""></div>
        <div class="username">${player.username}</div>
        <div class="ready" ready="${player.state}"></div>
    </div>
    `
}
function getReady() {
    socket.emit('getReady')
}
socket.on('getReady', ({ ready }) => {
    const readyButton = document.querySelector('.ready-control .get-ready')
    if (ready) {
        readyButton.innerHTML = 'Ready'
        readyButton.style.backgroundColor = 'var(--main)'
    } else {
        readyButton.innerHTML = 'Not Ready'
        readyButton.style.backgroundColor = 'var(--second)'
    }
})
socket.on('startingSeconds', ({startingSeconds})=>{
    const readyCount = document.querySelector('.ready-control .ready-count')
    readyCount.innerHTML = `Starting in ${startingSeconds}`
})
// </Waitign Screen>
// <START>

socket.on('start', ({players}) => {
    const playerContainer = document.querySelector('main section.center aside.players')
    playerContainer.innerHTML = ''
    players.forEach(player => {
        playerContainer.insertAdjacentHTML('beforeend', renderPlayer(player))
    })

    document.querySelector('#waiting-screen').style.display = 'none'
})

function renderPlayer(player) {
    return `
    <div class="player flex-row">
        <div class="avatar fill-image"><img src="../../public/data/avatars/${player.avatar}" alt=""></div>
        <div class="username">${player.username}</div>
        <div class="cards"> 5 </div>
    </div>
    `
}
// </START>
// <SECOND>

socket.on('newSecond', ({secondsLeft, turnSeconds})=>{
    updateTimer(secondsLeft,turnSeconds)
})
updateTimer = (seconds, turnSeconds) => {
    const timerSeconds = document.querySelector('.timer .seconds')
    const bar = document.querySelector('.timer .bar .progress')
    
    timerSeconds.innerHTML = seconds
    const left = (turnSeconds-seconds)/turnSeconds * 100
    bar.style.left = `-${left}%`
    bar.style.backgroundColor = 'var(--main)'

    if(seconds <= 5){
        bar.style.backgroundColor = 'var(--danger)'

        if(soundOn)
            clockTick.play()
        }
    }

    // </SECOND>
// <TURN>

socket.on('newTurn', ({currentPlayer})=>{
    
    updatePlayerGlow(currentPlayer)
    toggleHandCards(0)
})
socket.on('myTurn', ()=>{
    if(soundOn)
        ding.play()

    toggleHandCards(1)
})

function updatePlayerGlow(index){
    const players = document.querySelectorAll('main .center .players .player')
    players.forEach(player => {
        player.classList.remove('glowing')
    })
    players[index].classList.add('glowing')
}
function toggleHandCards(on){
    if(on == true){
        const hand = document.querySelector('.bottom .hand .cards')
        hand.classList.remove('gray')
    
        const drawCard = document.querySelector('.draw-card')
        drawCard.classList.remove('gray')
    }else{
        const hand = document.querySelector('.bottom .hand .cards')
        hand.classList.add('gray')
    
        const drawCard = document.querySelector('.draw-card')
        drawCard.classList.add('gray')
    }
}
// </TURN>