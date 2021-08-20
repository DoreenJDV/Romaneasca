window.onbeforeunload = e => ''
const socket = io({
    closeOnBeforeunload: false
})
const data = document.getElementById('data')
let user
let code


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
        <div class="image"><img src="../../public/data/avatars/${member.avatar}" alt=""></div>
        <div class="username">${member.username}</div>
    </div>
    `
}
//  </Choose team>


// <Starting game>
const startingIn = document.querySelector('#waiting-screen .ready .starting-in')
socket.on('startingSeconds', ({seconds}) =>{
    console.log(seconds)
    startingIn.innerHTML = `Starting in ${seconds}s`
})
socket.on('startingGame', ()=>{
    startingIn.innerHTML = `Starting in 0s`
    console.log('game started')
})
socket.on('startingGameStopped', ()=>{
    console.log('starting game stopped')
    startingIn.innerHTML = `Waiting for players`
})

socket.on('gameStarted', ({teams}) =>{
    teams.forEach((team, i) => {
        team.members.forEach((member, j) =>{
            document.querySelector(`main .player[team="${i}"][member="${j}"]`).innerHTML=`
                <div class="image profile-picture"><img src="../../public/data/avatars/${member.avatar}" alt=""></div>
                <div class="username">${member.username}</div>
                <div class="image team-logo"><img src="../../public/res/images/${team.shortname}.svg" alt=""></div>
            `
        })
    })

    const waitingScreen = document.getElementById('waiting-screen')
    waitingScreen.style.display = 'none'
})
// </Starting game>

// <GAME>

    socket.on('newSecond', ({second}) =>{
        const secondBar = document.querySelector('.timer .bar .seconds')
        secondBar.innerHTML = second
    })

// </GAME>



// <Lobby Chat>
sendLobbyChat = () => {
    const lobbyChatForm = document.getElementById('lobbyChatForm')
    const formData = new FormData(lobbyChatForm)
    const message = formData.get('message')
    if (message.length > 0) {
        socket.emit('lobbyChat', { message, user, code })
    }
    const input = document.querySelector('#lobbyChatForm input')
    input.value = ''
    input.focus()
}
socket.on('lobbyChat', ({ message, user }) => {
    const messageContainer = document.querySelector('.chat.lobby .messages')
    messageContainer.insertAdjacentHTML('beforeend', renderMessage(message, user))
    messageContainer.scrollTo(0, messageContainer.scrollHeight)
})
renderMessage = (message, user) => {
    return `
    <div class="message flex-row">
        <div class="user">${user.username}</div>
        <div class="text">${message}</div>
    </div>`
}
socket.on('lobbyChatAnnouncement', ({ user, message }) => {
    const messageContainer = document.querySelector('.chat.lobby .messages')
    messageContainer.insertAdjacentHTML('beforeend', renderAnnouncement(`${user.username} ${message}`))
})
renderAnnouncement = (message) => {
    return `<div class="announcement"> ${message} </div>`
}
// </Lobby Chat>

// <PING>
let pongServer = 'pong'
pingInterval = setInterval(() => {
    if (pongServer != 'pong') {
        clearInterval(pingInterval)
        window.onbeforeunload = () => {}
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
