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
    <form action="/romaneasca/game/${game.code}" class="room flex-row w100">
        <div class="name">${game.code}</div>
        <a class="owner">${game.owner}</a>
        <div class="player-count">${game.playerCount}/4</div>
        <div class="join"><button type="submit" >Join</button></div>
    </form>
    `
}
refreshList('romaneasca')

const joinForm = document.getElementById('join-form')
joinForm.addEventListener('submit', async e => {
    e.preventDefault()
    const formData = new FormData(joinForm)
    const code = formData.get('code')
    const result = await (await fetch('/romaneasca/getPlayerCount/' + code)).json()
    if (result.status == 1) {
        window.location = '/romaneasca/game/' + code
    }
})