const express = require('express')
const router = express.Router()
const dotenv = require('dotenv').config()
const db = require('../routes/mysql')()
const bcrypt = require('bcrypt')

router.get('/auth', (req, res) => {
    res.render('auth.ejs')
})

router.post('/register', (req, res) => {
    const countQuery = `SELECT COUNT(id) AS count FROM users WHERE email = "${req.body.email}"`
    db.query(countQuery, (err, data) => {
        if (data[0].count > 0) {
            return res.status(400).json({
                result: 0,
                message: 'Email is not available'
            })
        }
        else {
            const crypted = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10))
            const inser_user = `INSERT INTO users(email,username,password) VALUES("${req.body.email}","${req.body.username}","${crypted}")`
            db.query(inser_user, (error, result, fields) => {
                if (error) {
                    return res.status(500).json({
                        result: -1,
                        message: 'There was an error'
                    })
                }
                else {
                    return res.status(201).json({
                        result: 1,
                        message: 'User created'
                    })
                }
            })
        }
    })
})

router.post('/login', async (req, res) => {
    const serchQuery = `SELECT password AS password FROM users WHERE email = "${req.body.email}"`
    db.query(serchQuery, (error, data) => {
        if (error) {
            return res.json({
                result: -1,
                message: 'There was an error'
            })
        } else if (data) {
            const match = bcrypt.compareSync(req.body.password, data[0].password)
            if (match) {
                return res.status(200).json({
                    result: 1,
                    message: 'User logged'
                })
            }
            else {
                return res.json({
                    result: 0,
                    message: 'Email or password is incorrect'
                })
            }
        }
        else {
            return res.json({
                result: 0,
                message: 'Email or password is incorrect'
            })
        }
    })
})

module.exports = router