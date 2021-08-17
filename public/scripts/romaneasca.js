window.onbeforeunload = e => ''

const socket = io({
    closeOnBeforeunload: false
})

async function connectSocket(){
    const user = await (await fetch('/getuser')).json()
    const data = document.getElementById('data')
    const code = data.getAttribute('code')
    socket.emit('connectedToGame', {user, code: code.toString()})
}
connectSocket()


socket.on('refreshPlayerList', players =>{
    const playersContainer = document.querySelectorAll('#waiting-screen .players')[0]
    playersContainer.innerHTML =''
    players.forEach(player =>{
        playersContainer.insertAdjacentHTML('beforeend', renderPlayer(player))
    })
})
function renderPlayer(player){
    return `
    <div class="player flex-row">
        <div class="image"><img src="../../public/data/avatars/${player.avatar}" alt=""></div>
        <div class="username">${player.username}</div>
    </div>
    `
}

socket.on('backToRoot', () =>{
    window.location = '/'
})

socket.on('ping', ()=>{
    console.log('PONG')
})