const { Server } = require("socket.io")
const { createServer } = require("http")

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
  },
})

const games = new Map()

io.on("connection", (socket) => {
  const gameCode = socket.handshake.query.gameCode
  const isAdmin = socket.handshake.query.isAdmin === "true"

  if (!games.has(gameCode)) {
    games.set(gameCode, {
      players: new Map(),
      adminId: isAdmin ? socket.id : null,
      question: "",
      isStarted: false,
      showingAnswers: false,
    })
  }
  
  const game = games.get(gameCode)
  
  // Eğer admin bağlanıyorsa ve henüz admin yoksa, admin olarak ayarla
  if (isAdmin && !game.adminId) {
    game.adminId = socket.id
  }

  socket.on("setName", (name) => {
    // Eğer oyuncu zaten varsa, sadece ismini güncelle
    if (game.players.has(socket.id)) {
      const player = game.players.get(socket.id)
      player.name = name
    } else {
      // Yeni oyuncu ekle
      game.players.set(socket.id, {
        id: socket.id,
        name,
        answer: "",
        isReady: false,
        isAdmin: socket.id === game.adminId
      })
    }
    
    socket.join(gameCode)
    io.to(gameCode).emit(
      "playerJoined",
      Array.from(game.players.values())
    )
  })

  socket.on("startGame", (question) => {
    // Sadece admin oyunu başlatabilir
    if (socket.id === game.adminId) {
      game.question = question
      game.isStarted = true
      game.showingAnswers = false
      game.players.forEach((player) => {
        player.isReady = false
        player.answer = ""
      })
      io.to(gameCode).emit("gameStarted", question)
    }
  })

  socket.on("submitAnswer", (answer) => {
    const player = game.players.get(socket.id)
    if (player && !player.isAdmin && !game.showingAnswers) {  // Admin cevap veremez ve cevaplar gösterilirken yeni cevap verilemez
      player.answer = answer
      player.isReady = true
      io.to(gameCode).emit(
        "playerReady",
        Array.from(game.players.values())
      )
    }
  })

  socket.on("showAnswers", () => {
    if (socket.id === game.adminId) {
      game.showingAnswers = true
      io.to(gameCode).emit(
        "answersRevealed",
        Array.from(game.players.values())
      )
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
    }
  })

  socket.on("disconnect", () => {
    if (game.players.has(socket.id)) {
      // Eğer ayrılan kişi admin ise ve başka oyuncular varsa
      if (socket.id === game.adminId) {
        game.adminId = null
        // Oyunu sıfırla
        game.isStarted = false
        game.question = ""
        game.showingAnswers = false
      }
      
      game.players.delete(socket.id)
      io.to(gameCode).emit(
        "playerJoined",
        Array.from(game.players.values())
      )
    }
    
    // Odada kimse kalmadıysa oyunu sil
    if (game.players.size === 0) {
      games.delete(gameCode)
    }
  })
})

const PORT = process.env.PORT || 3002
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
}) 