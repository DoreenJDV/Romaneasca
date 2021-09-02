async function refreshList(short) {
    const refreshButton = document.querySelectorAll('.refresh-list')[0]
    refreshButton.classList.add('refreshing')
    const games = await (await fetch(`/${short}/getGames`)).json()
    const existingRooms = document.getElementById('existing-rooms')
    existingRooms.innerHTML = ''
    games.forEach(game => {
        existingRooms.insertAdjacentHTML('beforeend', renderGameRow(game))
    });
    refreshButton.classList.remove('refreshing')
}
function renderGameRow(game) {
    return `
    <form game="${game.code}" method="dialog" class="room flex-row w100">
        <div class="name">${game.code}</div>
        <a class="owner">${game.owner.username}</a>
        <div class="player-count">${game.playerCount}/4</div>
        <div class="join"><button onclick="joinGame(${game.code})" >Join</button></div>
    </form>
    `
}
refreshList('romaneasca')

const joinForm = document.getElementById('join-form')
joinForm.addEventListener('submit', async e => {
    e.preventDefault()
    const formData = new FormData(joinForm)
    const code = formData.get('code').toString()
    if (await canJoin(code) == 1) {
        window.location = '/romaneasca/game/' + code
    }
    else{
        createNotification('Cannot join this game')
    }
})
async function joinGame(code){
    if(await canJoin(code) == 1){
        window.location = '/romaneasca/game/' + code
    }
    else{
        createNotification('Cannot join this game')
    }
}
async function canJoin(code) {
    const result = await(await fetch('/romaneasca/canJoinGame/' + code)).json()
    return result.canJoin
}

async function createNotification(message){
    const container = document.querySelectorAll('.notifications')[0]
    const not_id = Date.now()

    const notification = `
    <div not_id="${not_id}" class="notification flex-row">
        <div class="message">${message}</div>
        <div class="close" onclick = closeNotification(${not_id})>X</div>
    </div>
    `
    container.insertAdjacentHTML('beforeend',notification)
    setTimeout(()=>{closeNotification(not_id)},5000)
}
function closeNotification(not_id){
    const not = document.querySelector(`[not_id="${not_id}"]`)
    not.style.left = '-20rem'
    setTimeout(()=>{
        if(not)not.remove()
    }, 1000)
}