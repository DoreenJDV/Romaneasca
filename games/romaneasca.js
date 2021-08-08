let rooms = []
getRoom = function (code) {
    rooms.filter(room => {
        return code == room.code
    })
    return null
}
