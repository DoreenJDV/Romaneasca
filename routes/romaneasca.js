const router = require('express').Router()
const verify = require('./verifyJWT')
const http = require('http')
const {Game, gameHandler} = require('../games/romaneasca')
const { json } = require('express')

module.exports = (io)=>{
    let games = []

    router.get('/', verify, async (req, res) => {
        const game = {
            short: 'romaneasca',
            name: 'Romaneasca'
        }
        res.render('lobby.ejs', {
            user: req.user,
            game: game
        })
    })
    
    router.post('/create',verify, async (req, res) => {
        const code = Date.now()
        const game = new Game(code, req.user.username)
        games.push(game)
    
        res.redirect('game/'+code)
    })
    
    router.get('/game/:code',verify, (req, res) => {

        const game = gameHandler.getGame(games,req.params.code)[0]
        // GATE KEEPING
        if(!game){
            console.log('no such game ',req.params.code)
            return res.redirect('../../')
        }
        else if(game){
            if(gameHandler.getPlayerCount(game)>=gameHandler.maxPlayerCount){
                console.log('room is full')
                return res.redirect('../../')
            }
        }
        // THERE IS AN AVAILABLE GAME
        else{

        }
        io.on('connection', async socket =>{
            
            

        })
        
        res.render('romaneasca.ejs', {user:req.user})
    })
    router.get('/getGames',verify, (req,res)=>{
        res.json(games.map(game =>{
            return {
                code: game.code,
                owner: game.owner,
                playerCount: game.playerCount
            }
        }))
    })
    router.get('/getPlayerCount/:code', (req,res)=>{
        const game = gameHandler.getGame(games, req.params.code)[0]
        if(game){
            const playerCount = (gameHandler.getPlayerCount(game))

            if(playerCount >= gameHandler.maxPlayerCount){
                res.json({
                    status: 0,
                    message: 'Room is full'
                })
            }
            else{
                res.json({
                    status: 1,
                    message: 'joining'
                })
            }
        }
        else {
            res.json({
                status: 0,
                message: 'There is no game with this code.'
            })
        }
    })

    return router
}