const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const verify = require('../routes/verifyJWT')
const bcrypt = require('bcrypt')
const db = require('../routes/mysql')()
require('dotenv').config()

router.get('/auth', (req, res) => {
    res.render('auth.ejs')
})

router.post('/register', (req, res) => {
    if(!(req.body.email && req.body.password && req.body.username)){
        return res.json({
            result: 0,
            message: 'All fields are required'
        })
    }

    const countQuery = `SELECT COUNT(id) AS count FROM users WHERE email = "${req.body.email}"`
    db.query(countQuery, (err, data) => {
        if (data[0].count > 0) {
            res.status(400).json({
                result: 0,
                message: 'Email is not available'
            })
        }
        else {
            const crypted = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10))
            const userID = 'UID' + Date.now()
            const insert_user = `INSERT INTO users(id,email,username,password) VALUES("${userID}","${req.body.email}","${req.body.username}","${crypted}")`
            db.query(insert_user, (error, result, fields) => {
                if (error) {
                    res.status(500).json({
                        result: -1,
                        message: 'There was an error'
                    })
                }
                else {
                    const token = generateToken(userID)
                    res.cookie('JWT', token, {
                        sameSite: 'strict',
                        httpOnly: true,
                        maxAge: 1000 * 60 * 60 * 6
                    }).json({
                        result: 1,
                        message: 'User created'
                    })
                    return
                }
            })
        }
    })
})

router.post('/login', async (req, res) => {
    if(!(req.body.email && req.body.password)){
        return res.json({
            result: 0,
            message: 'All fields are required'
        })
    }

    const serchQuery = `SELECT id,password FROM users WHERE email = "${req.body.email}"`
    
    db.query(serchQuery, (error, data) => {
        if (!error && data[0]) {
            const match = bcrypt.compareSync(req.body.password, data[0].password)
            if (match) {

                const token = generateToken(data[0].id)
                res.cookie('JWT', token, {
                    sameSite: 'strict',
                    httpOnly: true,
                    maxAge: 1000 * 60 * 60 * 6
                }).json({
                    result: 1,
                    message: 'User logged'
                })
                return
            }
        }
        return res.json({
            result: 0,
            message: 'Email or password is incorrect'
        })
    })
})
router.post('/logout', verify, (req, res) => {
    res.cookie('JWT', null, { maxAge: 1 })
    res.json(null)
})

function generateToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN)
}

module.exports = router