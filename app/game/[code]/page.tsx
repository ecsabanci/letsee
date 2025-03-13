"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/app/components/ui/button"
import { io } from "socket.io-client"

interface Player {
  id: string
  name: string
  answer: string
  isReady: boolean
  isAdmin: boolean
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

  useEffect(() => {
    const newSocket = io("http://localhost:3002", {
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

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [params.code, isAdmin])

  const handleSetName = () => {
    if (playerName.trim()) {
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

  if (!isNameSet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-100 to-white p-4">
        <div className="w-full max-w-md space-y-4">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="İsminizi girin"
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          />
          <Button onClick={handleSetName} className="w-full">
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
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-4">Oyun Kodu: {params.code}</h1>
          <div className="flex flex-wrap gap-2">
            {players.map((player) => (
              <div
                key={player.id}
                className={`px-3 py-1 rounded-full text-sm ${
                  player.isReady ? "bg-green-100" : "bg-gray-100"
                } ${player.isAdmin ? "border-2 border-blue-500" : ""}`}
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
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Sorunuzu yazın"
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
            />
            <Button onClick={handleStartGame} className="w-full">
              Oyunu Başlat
            </Button>
          </div>
        )}

        {gameStarted && !showAnswers && (
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <div className="font-bold text-lg">{question}</div>
            {!isReady && (
              <>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Cevabınızı yazın"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md h-32"
                />
                <Button onClick={handleSubmitAnswer} className="w-full">
                  Hazır
                </Button>
              </>
            )}
          </div>
        )}

        {showAnswers && (
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold mb-4">Cevaplar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="bg-gray-50 rounded-lg p-4 space-y-2"
                >
                  <div className="font-bold">{player.name}</div>
                  <div className="text-gray-700">{player.answer}</div>
                </div>
              ))}
            </div>
            {isAdmin && (
              <Button
                onClick={handleStartNewRound}
                className="w-full mt-4"
              >
                Yeni Tur Başlat
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 