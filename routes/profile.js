const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const verify = require('../routes/verifyJWT')
const db = require('../routes/mysql')()

const storage = multer.diskStorage({
    destination: path.join(__dirname, '../public/data/avatars/'),
    filename: (request, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname))
    }
})
const upload = multer({ storage: storage }).single('image')

router.get('/', verify, (req, res) => {
    res.render('profile.ejs', { user: req.user })

})
router.post('/updateProfile', verify, upload, async (req, res) => {
    if (req.body.newUsername) {
        await db.query(`UPDATE users SET username = '${req.body.newUsername}' WHERE id = "${req.user.id}"`, (err, data) => {
            if (err) console.log(err)
        })
    }
    if (req.file) {
        await db.query(`SELECT avatar FROM users WHERE id = '${req.user.id}'`, async (err, data) => {
            const oldAvatar = data[0].avatar

            const oldAvatarPath = path.join(__dirname, '../public/data/avatars/', oldAvatar)
            if (fs.existsSync(oldAvatarPath) && oldAvatar != 'default_avatar.svg') {
                fs.unlinkSync(oldAvatarPath)
            }

            await db.query(`UPDATE users SET avatar = '${req.file.filename}'  WHERE id = '${req.user.id}'`, (err2, data2) => {
                if (err2) console.log(err2)
            })
        })
    }
    res.redirect('/profile')
})
router.post('/updatePassword', verify, async (req, res) => {
    let result = 0
    let message = null

    db.query(`SELECT password FROM users WHERE email = '${req.user.email}'`, async (err, data) => {
        const hashedPassword = data[0].password
        if (bcrypt.compareSync(req.body.currentPassword, hashedPassword)) {
            const newHashedPassowrd = bcrypt.hashSync(req.body.newPassword, bcrypt.genSaltSync(10))
            db.query(`UPDATE users SET password = '${newHashedPassowrd}'`, (err2, data2) => {
                if (err2) {
                    result = -1
                    message = 'There was an error'
                }
                else {
                    result = 1
                    message = 'Password changed'
                }
                res.json({ result, message })
            })
        }
        else {
            result = 0
            message = 'Incorrect current password'
            res.json({ result, message })
        }
    })
})
module.exports = router