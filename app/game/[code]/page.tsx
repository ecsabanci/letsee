"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/app/components/ui/button"
import { io } from "socket.io-client"
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { Toaster, toast } from 'react-hot-toast'
import { useRouter } from "next/navigation"
import { UserPlusIcon } from "@heroicons/react/24/outline"
import { Modal } from "@/app/components/ui/modal"
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

  // Oyuncu sayısını ve hazır oyuncu sayısını hesapla
  const readyPlayerCount = players.filter(p => p.isReady).length
  const totalPlayerCount = players.length

  return (
    <div className="min-h-screen p-4 md:p-8">
      <Toaster />
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        {isAdmin && (
            <div className="flex items-center justify-between">
                <Button
                onClick={handleEndGame}
                className="bg-rose-500 hover:bg-rose-600 text-white mb-4"
                >
                Oyunu Sonlandır
                </Button>
                <Button
                onClick={() => setShowJoinRequests(true)}
                className="bg-lime-600 hover:bg-lime-700 text-white mb-4 flex items-center gap-2"
                >
                    <UserPlusIcon className="w-6 h-6" />
                    {joinRequests.length}
                </Button>
            </div>
        )}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">Oyun Kodu: <span className="text-teal-600">{params.code}</span></h1>
              <button onClick={handleCopyCode} className="ml-4 hover:text-teal-600 transition-colors">
                <ClipboardDocumentIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {players.map((player) => (
              <div
                key={player.id}
                className={`px-3 py-1 rounded-full text-sm border-2 ${
                  player.isReady ? "bg-teal-400" : "bg-gray-800"
                } ${player.isAdmin ? "border-sky-600" : "border-gray-600"}`}
              >
                {player.name} {player.isAdmin ? "(Admin)" : ""}
              </div>
            ))}
          </div>
          {gameStarted && (
            <div className="mt-4 text-sm text-gray-600">
              {readyPlayerCount} / {totalPlayerCount} oyuncu hazır
            </div>
          )}
        </div>

        {isAdmin && !gameStarted && (
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
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
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
            <div className="font-bold text-lg">{question}</div>
            {!isReady && (
              <>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Cevabınızı yazın"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md h-32 text-black focus:outline-none"
                />
                <Button onClick={handleSubmitAnswer} className="w-full bg-sky-600 text-white hover:bg-sky-700">
                  Hazır
                </Button>
              </>
            )}
          </div>
        )}

        {showAnswers && (
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold mb-4">Cevaplar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="bg-emerald-500 text-black rounded-lg p-4 space-y-2"
                >
                  <div className="font-bold">{player.name}</div>
                  <div className="text-gray-800">{player.answer}</div>
                </div>
              ))}
            </div>
            {isAdmin && (
              <Button
                onClick={handleStartNewRound}
                className="w-full mt-4 bg-blue-600 text-white hover:bg-blue-700"
              >
                Yeni Tur Başlat
              </Button>
            )}
          </div>
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
      </div>
    </div>
  )
} 