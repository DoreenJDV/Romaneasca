const mysql = require('mysql')

function getDB(){
    const db = mysql.createConnection({
        host:'127.0.0.1',
        user:'root',
        database:'romaneasca',
    })
    db.connect((err)=>{
        if(err){
            console.log(err)
        }
    })
    return db
}

module.exports = getDB