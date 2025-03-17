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
    
    if (game && socket.id === game.adminId) {
      const request = game.pendingRequests.find(req => req.id === playerId)
      game.pendingRequests = game.pendingRequests.filter(req => req.id !== playerId)
      
      // Oyuncuya onay ve mevcut oyun durumunu bildir
      io.to(playerId).emit("joinRequestApproved", { 
        gameCode,
        currentGameState: {
          question: game.question || "",
          isStarted: game.isStarted || false,
          showingAnswers: game.showingAnswers || false
        }
      })
      
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
      isAdmin: socket.id === game.adminId
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
      socket.emit("gameStarted", game.question)
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
})

const PORT = process.env.PORT || 3002
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
}) 