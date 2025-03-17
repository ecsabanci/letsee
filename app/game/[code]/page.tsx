"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/app/components/ui/button"
import { io } from "socket.io-client"
import { Toaster, toast } from 'react-hot-toast'
import { useRouter } from "next/navigation"
import { Modal } from "@/app/components/ui/modal"
import { EmojiBar } from "@/app/components/EmojiBar"
import { FloatingEmoji } from "@/app/components/FloatingEmoji"
import { GameHeader } from "@/app/components/GameHeader"
import { PlayersList } from "@/app/components/PlayersList"
import { QuestionAnswerForm } from "@/app/components/QuestionAnswerForm"
import { AnswersCard } from "@/app/components/AnswersCard"
// Socket.IO sunucu URL'ini ortama göre ayarla
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002"

interface JoinRequest {
  id: string
  name: string
  timestamp: number
}

interface Player {
  id: string
  name: string
  answer: string
  isReady: boolean
  isAdmin: boolean
}

interface JoinRequestApprovedData {
  gameCode: string
  currentGameState?: {
    question: string
    isStarted: boolean
    showingAnswers: boolean
  }
}

interface EmojiReaction {
  id: string
  emoji: string
  playerName: string
}

export default function GamePage({ params }: { params: { code: string } }) {
  const searchParams = useSearchParams()
  const isAdmin = searchParams.get("isAdmin") === "true"
  const [playerName, setPlayerName] = useState("")
  const [isNameSet, setIsNameSet] = useState(false)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [isReady, setIsReady] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [socket, setSocket] = useState<any>(null)
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const router = useRouter()
  const [showJoinRequests, setShowJoinRequests] = useState(false)
  const [emojiReactions, setEmojiReactions] = useState<EmojiReaction[]>([])

  useEffect(() => {
    // Eğer localStorage'da isim varsa, otomatik olarak ayarla
    const savedName = localStorage.getItem("playerName")
    if (savedName) {
      setPlayerName(savedName)
      if (isAdmin) {
        setIsNameSet(true)
        if (socket) {
          socket.emit("setName", savedName)
        }
      }
    }
  }, [isAdmin, socket])

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      query: { 
        gameCode: params.code,
        isAdmin: isAdmin.toString()
      },
    })

    newSocket.on("playerJoined", (players: Player[]) => {
      setPlayers(players)
    })

    newSocket.on("gameStarted", (question: string) => {
      setGameStarted(true)
      setShowAnswers(false)
      setQuestion(question)
      setIsReady(false)
      setAnswer("")
    })

    newSocket.on("playerReady", (players: Player[]) => {
      setPlayers(players)
    })

    newSocket.on("answersRevealed", (players: Player[]) => {
      setPlayers(players)
      setShowAnswers(true)
    })

    newSocket.on("roundEnded", (players: Player[]) => {
      setPlayers(players)
      setIsReady(false)
      setAnswer("")
      setGameStarted(false)
      setShowAnswers(false)
      setQuestion("")
    })

    newSocket.on("joinRequest", (data) => {
      setJoinRequests(data.requests)
    })

    newSocket.on("gameEnded", () => {
      router.push("/")
    })

    // Yeni katılan oyuncu için mevcut oyun durumunu ayarla
    newSocket.on("joinRequestApproved", (data: JoinRequestApprovedData) => {
      console.log("Join request approved with data:", data) // Debug için
      if (data.currentGameState) {
        setGameStarted(data.currentGameState.isStarted)
        setShowAnswers(data.currentGameState.showingAnswers)
        setQuestion(data.currentGameState.question)
      }
    })

    newSocket.on("emojiReaction", (reaction: EmojiReaction) => {
      setEmojiReactions(prev => [...prev, reaction])
      // 2 saniye sonra emojiyi kaldır
      setTimeout(() => {
        setEmojiReactions(prev => prev.filter(r => r.id !== reaction.id))
      }, 2000)
    })

    setSocket(newSocket)

    // Oyundan çıkıldığında temizlik yap
    return () => {
      if (newSocket) {
        newSocket.emit("leaveGame")
        newSocket.close()
      }
    }
  }, [params.code, isAdmin])

  const handleSetName = () => {
    if (playerName.trim()) {
      localStorage.setItem("playerName", playerName) // İsmi kaydet
      socket.emit("setName", playerName)
      setIsNameSet(true)
    }
  }

  const handleStartGame = () => {
    if (question.trim()) {
      socket.emit("startGame", question)
    }
  }

  const handleSubmitAnswer = () => {
    if (answer.trim()) {
      socket.emit("submitAnswer", answer)
      setIsReady(true)
    }
  }

  const handleStartNewRound = () => {
    socket.emit("startNewRound")
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(params.code)
    toast.success('Oyun kodu kopyalandı!', {
      duration: 2000,
      position: 'top-center',
      style: {
        background: '#4CAF50',
        color: '#fff',
      },
    })
  }

  const handleApproveRequest = (playerId: string) => {
    socket.emit("approveJoinRequest", {
      gameCode: params.code,
      playerId
    })
    setJoinRequests(prev => prev.filter(req => req.id !== playerId))
  }

  const handleRejectRequest = (playerId: string) => {
    socket.emit("rejectJoinRequest", {
      gameCode: params.code,
      playerId
    })
    setJoinRequests(prev => prev.filter(req => req.id !== playerId))
  }

  const handleEndGame = () => {
    if (socket) {
      socket.emit("endGame")
      router.push("/")
    }
  }

  const handleEmojiClick = (emoji: string) => {
    const reaction: EmojiReaction = {
      id: Math.random().toString(36).substring(2),
      emoji,
      playerName
    }
    socket.emit("sendEmojiReaction", reaction)
  }

  if (!isNameSet && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="İsminizi girin"
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:outline-none"
          />
          <Button onClick={handleSetName} className="w-full bg-sky-600 text-white hover:bg-sky-700">
            Oyuna Katıl
          </Button>
        </div>
      </div>
    )
  }

  const readyPlayerCount = players.filter(p => p.isReady).length
  const totalPlayerCount = players.length

  return (
    <div className="min-h-screen p-4 md:p-8">
      <Toaster />
      <div className="max-w-4xl mx-auto space-y-8 relative">
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 animate-fade-in">
            <GameHeader
            gameCode={params.code}
            isAdmin={isAdmin}
            joinRequestCount={joinRequests.length}
            onShowJoinRequests={() => setShowJoinRequests(true)}
            onEndGame={handleEndGame}
            />

            <PlayersList
            players={players}
            gameStarted={gameStarted}
            readyCount={readyPlayerCount}
            totalCount={totalPlayerCount}
            />
        </div>

        {isAdmin && !gameStarted && (
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-4 animate-slide-in">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Sorunuzu yazın"
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:outline-none"
            />
            <Button onClick={handleStartGame} className="w-full bg-sky-600 text-white hover:bg-sky-700">
              Oyunu Başlat
            </Button>
          </div>
        )}

        {gameStarted && !showAnswers && (
          <QuestionAnswerForm
            question={question}
            answer={answer}
            onAnswerChange={setAnswer}
            onSubmit={handleSubmitAnswer}
            isReady={isReady}
          />
        )}

        {showAnswers && (
          <AnswersCard
            players={players}
            isAdmin={isAdmin}
            onStartNewRound={handleStartNewRound}
          />
        )}

        <Modal
          isOpen={showJoinRequests}
          onClose={() => setShowJoinRequests(false)}
        >
          <div className="space-y-4">
            {joinRequests.length === 0 ? (
              <p className="text-center text-gray-500">Henüz katılma isteği yok</p>
            ) : (
              joinRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <span className="font-medium text-gray-900">{request.name}</span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        handleApproveRequest(request.id)
                        setShowJoinRequests(false)
                      }}
                      className="bg-lime-600 hover:bg-lime-700"
                    >
                      Onayla
                    </Button>
                    <Button
                      onClick={() => {
                        handleRejectRequest(request.id)
                        setShowJoinRequests(false)
                      }}
                      className="bg-rose-500 hover:bg-rose-600"
                    >
                      Reddet
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>

        {/* Emoji Reactions */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {emojiReactions.map((reaction) => (
            <FloatingEmoji
              key={reaction.id}
              emoji={reaction.emoji}
              playerName={reaction.playerName}
            />
          ))}
        </div>

        {/* Emoji Bar */}
        {isNameSet && <EmojiBar onEmojiClick={handleEmojiClick} />}
      </div>
    </div>
  )
} 