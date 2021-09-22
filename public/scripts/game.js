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

//CHAT
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

socket.on('clearChat', clearChat)
function clearChat() {
    const messageContainer = document.querySelector('.chat .messages')
    messageContainer.innerHTML = ''
}
// </Chat>

// <PING>
let pongServer = 'pong'
pingInterval = setInterval(() => {
    if (pongServer != 'pong') {
        clearInterval(pingInterval)
        window.onbeforeunload = () => { }
        window.location = `/${short}`
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
socket.on('redirect', () => {
    window.onbeforeunload = () => { }
    window.location.href = '../'
})
socket.on('reload', () => {
    window.onbeforeunload = () => { }
    location.reload()
})