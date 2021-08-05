async function refreshList(short){
    const rooms = (await fetch(`/${short}/getRooms`)).json()
    console.log(rooms)
    
}