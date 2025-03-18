const { Server } = require("socket.io")
const { createServer } = require("http")

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://letsee-ten.vercel.app"  // Vercel URL'iniz
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
})

const games = new Map()

// Turnuva maçlarını yönetmek için yeni bir Map
const tournamentGames = new Map()

// Aktif oyunların listesini döndüren fonksiyon
function getActiveGames() {
  const activeGames = []
  games.forEach((game, code) => {
    if (game.players.size > 0 && !game.isEnded) {  // Sadece aktif ve sonlanmamış oyunları listele
      activeGames.push({
        code,
        playerCount: game.players.size,
        isStarted: game.isStarted,
        adminName: Array.from(game.players.values()).find(p => p.id === game.adminId)?.name || 'İsimsiz',
        pendingRequests: game.pendingRequests || [],
        currentQuestion: game.question || '',  // Mevcut soruyu da gönder
        isEnded: game.isEnded || false
      })
    }
  })
  return activeGames
}

// Tüm bağlı istemcilere aktif oyun listesini gönder
function broadcastActiveGames() {
  io.emit("activeGames", getActiveGames())
}

io.on("connection", (socket) => {
  const gameCode = socket.handshake.query.gameCode
  const isAdmin = socket.handshake.query.isAdmin === "true"

  // Ana sayfada aktif oyunları listele
  socket.on("getActiveGames", () => {
    socket.emit("activeGames", getActiveGames())
  })

  // Her 1 dakikada bir aktif oyunları güncelle
  const updateInterval = setInterval(() => {
    socket.emit("activeGames", getActiveGames())
  }, 60000)

  socket.on("disconnect", () => {
    clearInterval(updateInterval)
  })

  // Oyuna katılma isteği gönder
  socket.on("sendJoinRequest", (data) => {
    const { gameCode, playerName } = data
    const game = games.get(gameCode)
    
    if (game) {
      if (!game.pendingRequests) {
        game.pendingRequests = []
      }
      
      // İsteği ekle
      game.pendingRequests.push({
        id: socket.id,
        name: playerName,
        timestamp: Date.now()
      })
      
      // Admine bildiri gönder
      if (game.adminId) {
        io.to(game.adminId).emit("joinRequest", {
          gameCode,
          requests: game.pendingRequests
        })
      }
      
      broadcastActiveGames()
    }
  })

  // Admin isteği onayladığında
  socket.on("approveJoinRequest", (data) => {
    const { gameCode, playerId } = data
    const game = games.get(gameCode)
    const tournamentGame = tournamentGames.get(gameCode)
    
    if (game && socket.id === game.adminId) {
      const request = game.pendingRequests.find(req => req.id === playerId)
      game.pendingRequests = game.pendingRequests.filter(req => req.id !== playerId)
      
      // Oyuncuya onay ve mevcut oyun durumunu bildir
      io.to(playerId).emit("joinRequestApproved", { 
        gameCode,
        currentGameState: {
          question: game.question || "",
          isStarted: game.isStarted || false,
          showingAnswers: game.showingAnswers || false,
          isTournament: game.isTournament || false,
          tournamentCategory: game.tournamentCategory || null,
          gameStarted: game.isStarted || false
        }
      })

      // Eğer turnuva devam ediyorsa, yeni oyuncuya mevcut turnuva durumunu gönder
      if (tournamentGame && game.isTournament) {
        const { matches, currentMatchIndex, currentRound, winners, totalRounds } = tournamentGame
        const currentMatch = matches[currentMatchIndex]
        
        // Önce turnuva başlangıç bilgilerini gönder
        io.to(playerId).emit("tournamentStarted", {
          category: game.tournamentCategory,
          totalRounds: tournamentGame.totalRounds,
          totalParticipants: game.tournamentCategory.options.length
        })

        // Sonra mevcut maç durumunu gönder
        io.to(playerId).emit("tournamentMatches", {
          match: {
            ...currentMatch,
            votes: currentMatch.votes || {},
            votedPlayers: Array.from(currentMatch.votedPlayers || new Set())
          },
          round: currentRound,
          winners,
          totalRounds,
          remainingMatches: matches.length - currentMatchIndex - 1,
          votedPlayerCount: currentMatch.votedPlayers?.size || 0,
          totalPlayerCount: game.players.size
        })
      }
      
      broadcastActiveGames()
    }
  })

  // Admin isteği reddettiğinde
  socket.on("rejectJoinRequest", (data) => {
    const { gameCode, playerId } = data
    const game = games.get(gameCode)
    
    if (game && socket.id === game.adminId) {
      // İsteği listeden kaldır
      game.pendingRequests = game.pendingRequests.filter(req => req.id !== playerId)
      
      // Oyuncuya red bildir
      io.to(playerId).emit("joinRequestRejected", { gameCode })
      
      broadcastActiveGames()
    }
  })

  let game
  if (!games.has(gameCode)) {
    game = {
      players: new Map(),
      adminId: isAdmin ? socket.id : null,
      question: "",
      isStarted: false,
      showingAnswers: false,
      pendingRequests: [],
      isEnded: false  // Oyun sonlandırma durumu
    }
    games.set(gameCode, game)
    broadcastActiveGames()
  } else {
    game = games.get(gameCode)
  }
  
  // Eğer admin bağlanıyorsa ve henüz admin yoksa, admin olarak ayarla
  if (isAdmin && !game.adminId) {
    game.adminId = socket.id
  }

  socket.on("setName", (name) => {
    // Oyuncuyu ekle veya güncelle
    const player = {
      id: socket.id,
      name,
      answer: "",
      isReady: false,
      isAdmin: socket.id === game.adminId,
      isTournament: game.isTournament || false,
      tournamentCategory: game.tournamentCategory || null,
      gameStarted: game.isStarted || false
    }
    
    game.players.set(socket.id, player)
    socket.join(gameCode)
    
    // Tüm oyunculara güncel listeyi gönder
    io.to(gameCode).emit(
      "playerJoined",
      Array.from(game.players.values())
    )

    // Yeni katılan oyuncuya mevcut oyun durumunu gönder
    if (game.isStarted) {
      // Önce temel oyun durumunu gönder
      socket.emit("joinRequestApproved", {
        gameCode,
        currentGameState: {
          question: game.question || "",
          isStarted: game.isStarted || false,
          showingAnswers: game.showingAnswers || false,
          isTournament: game.isTournament || false,
          tournamentCategory: game.tournamentCategory || null,
          gameStarted: game.isStarted || false
        }
      })

      // Eğer turnuva devam ediyorsa
      if (game.isTournament && game.tournamentCategory) {
        // Önce turnuva başlangıç bilgilerini gönder
        socket.emit("tournamentStarted", {
          category: game.tournamentCategory,
          totalRounds: game.tournamentCategory.options.length,
          totalParticipants: game.players.size
        })

        // Sonra turnuva maçlarını iste
        socket.emit("requestTournamentMatches", {
          gameCode,
          category: game.tournamentCategory
        })
      } else {
        socket.emit("gameStarted", game.question)
      }
    }
    if (game.showingAnswers) {
      socket.emit("answersRevealed", Array.from(game.players.values()))
    }
    
    broadcastActiveGames()
  })

  socket.on("startGame", (question) => {
    if (socket.id === game.adminId) {
      game.question = question
      game.isStarted = true
      game.showingAnswers = false
      game.players.forEach((player) => {
        player.isReady = false
        player.answer = ""
      })
      io.to(gameCode).emit("gameStarted", question)
      broadcastActiveGames()
    }
  })

  socket.on("submitAnswer", (answer) => {
    const player = game.players.get(socket.id)
    if (player && !game.showingAnswers) {  // Cevaplar gösterilirken yeni cevap verilemez
      player.answer = answer
      player.isReady = true
      io.to(gameCode).emit(
        "playerReady",
        Array.from(game.players.values())
      )

      // Tüm oyuncuların hazır olup olmadığını kontrol et
      const allReady = Array.from(game.players.values()).every(p => p.isReady)
      
      // Eğer tüm oyuncular hazırsa ve admin de hazırsa, otomatik olarak cevapları göster
      if (allReady) {
        game.showingAnswers = true
        io.to(gameCode).emit(
          "answersRevealed",
          Array.from(game.players.values())
        )
      }
    }
  })

  socket.on("startNewRound", () => {
    if (socket.id === game.adminId) {
      game.isStarted = false
      game.showingAnswers = false
      game.question = ""
      game.players.forEach((player) => {
        player.isReady = false
        player.answer = ""
      })
      io.to(gameCode).emit(
        "roundEnded",
        Array.from(game.players.values())
      )
      broadcastActiveGames()
    }
  })

  // Oyunu sonlandır
  socket.on("endGame", () => {
    if (socket.id === game.adminId) {
      game.isEnded = true
      game.isStarted = false
      game.showingAnswers = false
      game.question = ""
      
      io.to(gameCode).emit("gameEnded")
      broadcastActiveGames()
      
      // Oyuncuları temizle
      game.players.clear()
      games.delete(gameCode)
    }
  })

  // Oyundan ayrılma
  socket.on("leaveGame", () => {
    if (game) {
      game.players.delete(socket.id)
      
      // Eğer admin ayrıldıysa oyunu sonlandır
      if (socket.id === game.adminId) {
        game.isEnded = true
        game.isStarted = false
        io.to(gameCode).emit("gameEnded")
        games.delete(gameCode)
      }
      
      io.to(gameCode).emit(
        "playerJoined",
        Array.from(game.players.values())
      )
      
      broadcastActiveGames()
    }
  })

  socket.on("disconnect", () => {
    if (game && game.players.has(socket.id)) {
      // Admin ayrıldığında oyunu sonlandır
      if (socket.id === game.adminId) {
        game.isEnded = true
        game.isStarted = false
        io.to(gameCode).emit("gameEnded")
        games.delete(gameCode)
      } else {
        game.players.delete(socket.id)
        
        if (game.players.size > 0) {
          io.to(gameCode).emit(
            "playerJoined",
            Array.from(game.players.values())
          )
        } else {
          games.delete(gameCode)
        }
      }
      
      broadcastActiveGames()
    }
  })

  socket.on("sendEmojiReaction", (reaction) => {
    const game = games.get(gameCode)
    if (game) {
      // Emoji reaksiyonunu odadaki tüm oyunculara ilet
      io.to(gameCode).emit("emojiReaction", reaction)
    }
  })

  socket.on("tournamentVote", (data) => {
    const { gameCode, matchId, optionId } = data
    const game = games.get(gameCode)
    const tournamentGame = tournamentGames.get(gameCode)
    
    if (!game || !tournamentGame) return

    const currentMatch = tournamentGame.matches[tournamentGame.currentMatchIndex]
    if (!currentMatch) return
    
    // Oy verme işlemi
    try {
      // Oyları ve oy verenleri başlat
      if (!currentMatch.votes) currentMatch.votes = {}
      if (!currentMatch.votedPlayers) currentMatch.votedPlayers = new Set()
      
      // Eğer bu oyuncu daha önce oy vermemişse
      if (!currentMatch.votedPlayers.has(socket.id)) {
        // Oyu kaydet
        currentMatch.votedPlayers.add(socket.id)
        currentMatch.votes[optionId] = (currentMatch.votes[optionId] || 0) + 1

        // Oy durumunu gönder
        const voteUpdate = {
          matchId,
          optionId,
          votes: { ...currentMatch.votes },
          votedPlayers: Array.from(currentMatch.votedPlayers),
          votedPlayerCount: currentMatch.votedPlayers.size,
          totalPlayerCount: game.players.size
        }
        
        io.to(gameCode).emit("tournamentVote", voteUpdate)

        // Tüm oylar toplandıysa
        if (currentMatch.votedPlayers.size === game.players.size) {
          setTimeout(() => {
            try {
              const option1Votes = currentMatch.votes[currentMatch.option1.id] || 0
              const option2Votes = currentMatch.votes[currentMatch.option2.id] || 0

              // Eşitlik kontrolü
              if (option1Votes === option2Votes && currentMatch.option2) {
                // Eşitlik durumu için basitleştirilmiş veri
                const simplifiedMatch = {
                  option1: {
                    id: currentMatch.option1.id,
                    title: currentMatch.option1.title,
                    imageUrl: currentMatch.option1.imageUrl
                  },
                  option2: {
                    id: currentMatch.option2.id,
                    title: currentMatch.option2.title,
                    imageUrl: currentMatch.option2.imageUrl
                  },
                  votes: { ...currentMatch.votes }
                }

                io.to(gameCode).emit("tournamentTie", simplifiedMatch)

                // Eşitlik timeout'unu ayarla
                if (currentMatch.tieTimeout) {
                  clearTimeout(currentMatch.tieTimeout)
                }

                currentMatch.tieTimeout = setTimeout(() => {
                  try {
                    // Oyları sıfırla
                    currentMatch.votes = {}
                    currentMatch.votedPlayers.clear()

                    // Basitleştirilmiş veri gönder
                    const resetData = {
                      match: {
                        id: currentMatch.id,
                        round: currentMatch.round,
                        option1: {
                          id: currentMatch.option1.id,
                          title: currentMatch.option1.title,
                          imageUrl: currentMatch.option1.imageUrl
                        },
                        option2: {
                          id: currentMatch.option2.id,
                          title: currentMatch.option2.title,
                          imageUrl: currentMatch.option2.imageUrl
                        },
                        votes: {},
                        votedPlayers: []
                      },
                      round: tournamentGame.currentRound,
                      winners: tournamentGame.winners.map(w => ({
                        id: w.id,
                        title: w.title,
                        imageUrl: w.imageUrl
                      })),
                      totalRounds: tournamentGame.totalRounds,
                      remainingMatches: tournamentGame.matches.length - tournamentGame.currentMatchIndex - 1
                    }

                    io.to(gameCode).emit("tournamentTieEnd", resetData)
                  } catch (error) {
                    console.error("Tie timeout error:", error)
                  }
                }, 60000)
              } else {
                // Normal sonuç işleme
                processMatchResult(gameCode, game, tournamentGame, currentMatch)
              }
            } catch (error) {
              console.error("Vote processing error:", error)
            }
          }, 500)
        }
      }
    } catch (error) {
      console.error("Tournament vote error:", error)
    }
  })

  // Maç sonucu işleme fonksiyonu
  function processMatchResult(gameCode, game, tournamentGame, currentMatch) {
    const { matches, currentMatchIndex, currentRound, totalRounds } = tournamentGame
    
    // Kazananı belirle
    let winner
    if (!currentMatch.option2) {
        winner = currentMatch.option1
    } else {
        const option1Votes = currentMatch.votes[currentMatch.option1.id] || 0
        const option2Votes = currentMatch.votes[currentMatch.option2.id] || 0
        winner = option1Votes >= option2Votes ? currentMatch.option1 : currentMatch.option2
    }
    
    tournamentGame.winners.push(winner)

    // Sonraki maça geç veya yeni tur başlat
    if (currentMatchIndex + 1 < matches.length) {
        // Sonraki maç
        tournamentGame.currentMatchIndex++
        const nextMatch = matches[currentMatchIndex + 1]
        
        const matchUpdate = {
            match: {
                id: nextMatch.id,
                round: nextMatch.round,
                option1: {
                    id: nextMatch.option1.id,
                    title: nextMatch.option1.title,
                    imageUrl: nextMatch.option1.imageUrl
                },
                option2: nextMatch.option2 ? {
                    id: nextMatch.option2.id,
                    title: nextMatch.option2.title,
                    imageUrl: nextMatch.option2.imageUrl
                } : null,
                votes: {},
                votedPlayers: []
            },
            round: currentRound,
            winners: tournamentGame.winners.map(w => ({
                id: w.id,
                title: w.title,
                imageUrl: w.imageUrl
            })),
            totalRounds,
            remainingMatches: matches.length - (currentMatchIndex + 1),
            votedPlayerCount: 0,
            totalPlayerCount: game.players.size
        }
        
        io.to(gameCode).emit("tournamentMatches", matchUpdate)
    } else {
        // Yeni tur başlat
        startNewRound(gameCode, game, tournamentGame, winner)
    }
  }

  // Yeni tur başlatma fonksiyonu
  function startNewRound(gameCode, game, tournamentGame, lastWinner) {
    const nextRound = tournamentGame.currentRound + 1

    if (nextRound > tournamentGame.totalRounds || tournamentGame.winners.length === 1) {
        io.to(gameCode).emit("tournamentEnded", {
            id: lastWinner.id,
            title: lastWinner.title,
            imageUrl: lastWinner.imageUrl
        })
        tournamentGames.delete(gameCode)
        return
    }

    const newMatches = createNewRoundMatches(tournamentGame.winners, nextRound)
    
    tournamentGame.currentRound = nextRound
    tournamentGame.matches = newMatches
    tournamentGame.currentMatchIndex = 0
    tournamentGame.winners = []

    const matchUpdate = {
        match: {
            id: newMatches[0].id,
            round: nextRound,
            option1: {
                id: newMatches[0].option1.id,
                title: newMatches[0].option1.title,
                imageUrl: newMatches[0].option1.imageUrl
            },
            option2: newMatches[0].option2 ? {
                id: newMatches[0].option2.id,
                title: newMatches[0].option2.title,
                imageUrl: newMatches[0].option2.imageUrl
            } : null,
            votes: {},
            votedPlayers: []
        },
        round: nextRound,
        winners: [],
        totalRounds: tournamentGame.totalRounds,
        remainingMatches: newMatches.length - 1,
        votedPlayerCount: 0,
        totalPlayerCount: game.players.size
    }

    io.to(gameCode).emit("tournamentMatches", matchUpdate)
  }

  // Yeni tur için maçları oluşturma fonksiyonu
  function createNewRoundMatches(winners, round) {
    const matches = []
    const roundWinners = [...winners]
    
    for (let i = 0; i < roundWinners.length; i += 2) {
        if (i + 1 >= roundWinners.length) {
            matches.push({
                id: `match-${round}-${i/2}`,
                round: round,
                option1: roundWinners[i],
                option2: null,
                votes: {},
                votedPlayers: new Set()
            })
        } else {
            matches.push({
                id: `match-${round}-${i/2}`,
                round: round,
                option1: roundWinners[i],
                option2: roundWinners[i + 1],
                votes: {},
                votedPlayers: new Set()
            })
        }
    }
    
    return matches
  }

  // Turnuvayı başlat
  socket.on("startTournament", (data) => {
    const { gameCode, category } = data
    const game = games.get(gameCode)
    
    if (game && socket.id === game.adminId) {
      try {
        // Tüm seçenekleri karıştır
        const shuffledOptions = [...category.options].sort(() => Math.random() - 0.5)

        // İlk turu oluştur
        const matches = []
        for (let i = 0; i < shuffledOptions.length; i += 2) {
          if (i + 1 >= shuffledOptions.length) {
            matches.push({
              id: `match-1-${i/2}`,
              round: 1,
              option1: shuffledOptions[i],
              option2: null,
              votes: {},
              votedPlayers: new Set()
            })
          } else {
            matches.push({
              id: `match-1-${i/2}`,
              round: 1,
              option1: shuffledOptions[i],
              option2: shuffledOptions[i + 1],
              votes: {},
              votedPlayers: new Set()
            })
          }
        }

        // Toplam tur sayısını hesapla (log2 ile yukarı yuvarla)
        const totalRounds = Math.ceil(Math.log2(shuffledOptions.length))

        // Turnuva oyununu oluştur
        const tournamentGame = {
          currentRound: 1,
          matches,
          currentMatchIndex: 0,
          winners: [],
          totalRounds
        }
        tournamentGames.set(gameCode, tournamentGame)

        // Oyun durumunu güncelle
        game.tournamentCategory = category
        game.isTournament = true
        game.isStarted = true

        // İlk maçı gönder
        const firstMatch = {
          match: {
            id: matches[0].id,
            round: 1,
            option1: {
              id: matches[0].option1.id,
              title: matches[0].option1.title,
              imageUrl: matches[0].option1.imageUrl
            },
            option2: matches[0].option2 ? {
              id: matches[0].option2.id,
              title: matches[0].option2.title,
              imageUrl: matches[0].option2.imageUrl
            } : null,
            votes: {},
            votedPlayers: []
          },
          round: 1,
          winners: [],
          totalRounds,
          remainingMatches: matches.length - 1,
          votedPlayerCount: 0,
          totalPlayerCount: game.players.size
        }

        io.to(gameCode).emit("tournamentMatches", firstMatch)
        io.to(gameCode).emit("tournamentStarted", {
          category,
          totalRounds,
          totalParticipants: shuffledOptions.length
        })

        broadcastActiveGames()
      } catch (error) {
        console.error("Tournament start error:", error)
      }
    }
  })

  socket.on("tournamentChatMessage", (data) => {
    const { gameCode, message } = data
    const game = games.get(gameCode)
    const player = game?.players.get(socket.id)
    
    if (game && player && message.trim()) {
      const chatMessage = {
        id: `${Date.now()}-${socket.id}`,
        playerName: player.name,
        message: message.trim(),
        timestamp: Date.now()
      }
      
      io.to(gameCode).emit("tournamentChatMessage", chatMessage)
    }
  })

  // Eşitlik durumunda yeni oylama başlat
  socket.on("endTournamentTie", (data) => {
    const { gameCode } = data
    const game = games.get(gameCode)
    const tournamentGame = tournamentGames.get(gameCode)
    
    if (game && tournamentGame && socket.id === game.adminId) {
      try {
        const currentMatch = tournamentGame.matches[tournamentGame.currentMatchIndex]
        
        // Oyları ve oy verenleri sıfırla
        currentMatch.votes = {}
        currentMatch.votedPlayers = new Set()

        // Timeout'u temizle
        if (currentMatch.tieTimeout) {
          clearTimeout(currentMatch.tieTimeout)
          delete currentMatch.tieTimeout
        }

        // Yeni oylama için güncellenmiş maç bilgilerini gönder
        const matchUpdate = {
          match: {
            id: currentMatch.id,
            round: currentMatch.round,
            option1: {
              id: currentMatch.option1.id,
              title: currentMatch.option1.title,
              imageUrl: currentMatch.option1.imageUrl
            },
            option2: currentMatch.option2 ? {
              id: currentMatch.option2.id,
              title: currentMatch.option2.title,
              imageUrl: currentMatch.option2.imageUrl
            } : null,
            votes: {},
            votedPlayers: []
          },
          round: tournamentGame.currentRound,
          winners: tournamentGame.winners.map(w => ({
            id: w.id,
            title: w.title,
            imageUrl: w.imageUrl
          })),
          totalRounds: tournamentGame.totalRounds,
          remainingMatches: tournamentGame.matches.length - tournamentGame.currentMatchIndex - 1,
          votedPlayerCount: 0,
          totalPlayerCount: game.players.size
        }

        io.to(gameCode).emit("tournamentTieEnd", matchUpdate)
      } catch (error) {
        console.error("End tournament tie error:", error)
      }
    }
  })

  // Turnuva maç bilgilerini talep et
  socket.on("requestTournamentMatches", (data) => {
    const { gameCode } = data
    const game = games.get(gameCode)
    const tournamentGame = tournamentGames.get(gameCode)
    
    if (!game || !tournamentGame) return

    try {
      // Önce turnuva başlangıç bilgilerini gönder
      socket.emit("tournamentStarted", {
        category: game.tournamentCategory,
        totalRounds: tournamentGame.totalRounds,
        totalParticipants: game.tournamentCategory.options.length
      })

      // Sonra mevcut maç durumunu gönder
      const currentMatch = tournamentGame.matches[tournamentGame.currentMatchIndex]
      
      const matchUpdate = {
        match: {
          id: currentMatch.id,
          round: currentMatch.round,
          option1: {
            id: currentMatch.option1.id,
            title: currentMatch.option1.title,
            imageUrl: currentMatch.option1.imageUrl
          },
          option2: currentMatch.option2 ? {
            id: currentMatch.option2.id,
            title: currentMatch.option2.title,
            imageUrl: currentMatch.option2.imageUrl
          } : null,
          votes: { ...currentMatch.votes } || {},
          votedPlayers: Array.from(currentMatch.votedPlayers || new Set())
        },
        round: tournamentGame.currentRound,
        winners: tournamentGame.winners.map(w => ({
          id: w.id,
          title: w.title,
          imageUrl: w.imageUrl
        })),
        totalRounds: tournamentGame.totalRounds,
        remainingMatches: tournamentGame.matches.length - tournamentGame.currentMatchIndex - 1,
        votedPlayerCount: currentMatch.votedPlayers?.size || 0,
        totalPlayerCount: game.players.size
      }

      socket.emit("tournamentMatches", matchUpdate)
    } catch (error) {
      console.error("Request tournament matches error:", error)
    }
  })
})

const PORT = process.env.PORT || 3002
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
}) 