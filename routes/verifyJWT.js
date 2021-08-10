const jwt = require('jsonwebtoken')
const db = require('./mysql')()
const fs = require('fs')
const path = require('path')

module.exports = function (req, res, next) {
    const token = req.cookies.JWT;

    if (token) {
        jwt.verify(token, process.env.ACCESS_TOKEN, (err, data) => {
            if (err) {
                req.hasAccess = false
                return res.redirect('/auth')
            }

            db.query(`SELECT id, email, username, avatar FROM users WHERE id = "${jwt.decode(token, process.env.ACCESS_TOKEN)}"`, (dbErr, dbData) =>{               
                
                req.user = dbData[0]

                const avatarPath = path.join(__dirname, '../public/data/avatars/', req.user.avatar)
                if(!fs.existsSync(avatarPath)){
                    req.user.avatar = 'default_avatar.svg'
                }
                
                req.hasAccess = true
                res.cookie('JWT', token, {
                    sameSite: 'strict',
                    httpOnly: true,
                    maxAge: 1000 * 60 * 60 * 3
                })
                next()
            })
        })
    }
    else {
        req.hasAccess = false
        return res.redirect('/auth')
    }
}