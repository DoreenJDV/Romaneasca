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
