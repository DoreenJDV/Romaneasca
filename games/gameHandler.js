gameHandler = {
    getGameByCode: (games, code) => {
        return games.filter(game => {
            return code == game.code
        })[0]
    },
    getGameBySocket: (games, socketID) => {
        return games.filter(game => {
            const foundPlayer = game.players.filter(player => {
                return player.socket == socketID
            })
            if (foundPlayer[0]) return 1;
            else return 0;
        })[0]
    },
    getPlayerBySocket: (game, socketID) => {
        return game.players.filter(player => {
            return player.socket == socketID
        })[0]
    },
    getPlayerByID: (game, id) => {
        return game.players.filter(player => {
            return player.id == id
        })[0]
    },
    getMemberOrderBySocket(game, socketID) {
        for (let t = 0; t < 2; t++)
            for (let m = 0; m < 2; m++)
                if (game.teams[t].members[m].socket == socketID)
                    return { team: t, member: m }
        return null
    },
    getMemberOrderByID(game, userID) {
        for (let t = 0; t < 2; t++)
            for (let m = 0; m < 2; m++)
                if (game.teams[t].members[m].id == userID)
                    return { team: t, member: m }
        return null
    },
    getDisconnectedPlayers(game) {
        return game.players.filter(player => {
            return player.connected == false
        }).map(player => {
            return {
                id: player.id,
                username: player.username,
                avatar: player.avatar,
                socket: null,
                connected: false
            }
        })
    },
    isPlayerInGame: (game, playerID) => {
        const newFilter = game.players.filter(player => {
            if (player.id == playerID) return 1
            return 0
        })
        if (newFilter.length == 0) return 0
        return 1
    },
    removePlayerFromGame: (game, playerID) => {
        const index = game.players.map(player => player.id).indexOf(playerID)
        if (index > -1) {
            game.players.splice(index, 1)
            game.playerCount--
        }
    },
    removePlayerFromTeam: (game, playerID) => {
        game.teams.forEach((team, i) => {
            const index = team.members.map(member => member.id).indexOf(playerID)
            if (index > -1) {
                team.members.splice(index, 1)
                game.readyCount--
            }
        })
    },
    disposeGame: (games, code) => {
        games.splice(games.map(game => game.code).indexOf(code), 1)
    }

}
module.exports = gameHandler