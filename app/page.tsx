"use client"

import { useEffect, useState } from "react"
import { Button } from "./components/ui/button"
import { useRouter } from "next/navigation"
import { io } from "socket.io-client"
import { toast, Toaster } from "react-hot-toast"
import { Modal } from "./components/ui/modal"
import { PuzzlePieceIcon, PlusIcon, PlayIcon, PlayCircleIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/outline"
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002"

interface ActiveGame {
  code: string
  playerCount: number
  isStarted: boolean
  adminName: string
  currentQuestion: string
  isEnded: boolean
  pendingRequests: Array<{
    id: string
    name: string
    timestamp: number
  }>
}

export default function Home() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([])
  const [socket, setSocket] = useState<any>(null)
  const [showNameInput, setShowNameInput] = useState(false)
  const [selectedGameCode, setSelectedGameCode] = useState("")
  const [showCreateGameInput, setShowCreateGameInput] = useState(false)
  const [adminName, setAdminName] = useState("")

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      query: { gameCode: "", isAdmin: "false" }
    })
    setSocket(newSocket)

    newSocket.emit("getActiveGames")

    newSocket.on("activeGames", (games: ActiveGame[]) => {
      console.log("Aktif oyunlar güncellendi:", games)
      setActiveGames(games)
    })

    newSocket.on("joinRequestApproved", (data) => {
      toast.success("Katılma isteğiniz onaylandı!")
      router.push(`/game/${data.gameCode}`)
    })

    newSocket.on("joinRequestRejected", () => {
      toast.error("Katılma isteğiniz reddedildi.")
      setShowNameInput(false)
      setSelectedGameCode("")
    })

    return () => {
      newSocket.close()
    }
  }, [])

  const createGame = async () => {
    if (!adminName.trim()) {
      toast.error("Lütfen isminizi girin!")
      return
    }

    const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    localStorage.setItem("playerName", adminName) // İsmi kaydet
    router.push(`/game/${gameCode}?isAdmin=true`)
  }

  const joinGame = () => {
    if (joinCode.trim()) {
      router.push(`/game/${joinCode.toUpperCase()}`)
    }
  }

  const handleJoinRequest = (gameCode: string) => {
    setSelectedGameCode(gameCode)
    setShowNameInput(true)
  }

  const sendJoinRequest = () => {
    if (playerName.trim() && selectedGameCode) {
      socket.emit("sendJoinRequest", {
        gameCode: selectedGameCode,
        playerName: playerName
      })
      toast.success("Katılma isteği gönderildi!")
      setShowNameInput(false)
    }
  }

  // Debug için aktif oyunları konsola yazdır
  useEffect(() => {
    console.log("Mevcut aktif oyunlar:", activeGames)
  }, [activeGames])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-gray-900 text-white">
      <Toaster />
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Oyun Zamanı!</h1>
          <p className="text-gray-400">Yeni bir oyun oluştur veya mevcut bir oyuna katıl</p>
        </div>

        <div className="space-y-4">
          {!showCreateGameInput ? (
            <Button
              onClick={() => setShowCreateGameInput(true)}
              className="w-full bg-sky-600 text-white hover:bg-sky-700 flex items-center justify-center gap-2"
            >
              Yeni Oyun Oluştur
              <PuzzlePieceIcon className="w-6 h-6" />
            </Button>
          ) : (
            <div className="bg-gray-800 rounded-lg shadow p-4 space-y-4">
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="İsminizi girin"
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:outline-none"
                autoFocus
              />
              <div className="flex space-x-2">
                <Button
                  onClick={createGame}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1"
                >
                  Oyunu Başlat
                  <PlayIcon className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => {
                    setShowCreateGameInput(false)
                    setAdminName("")
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white flex items-center gap-1"
                >
                  İptal
                  <XMarkIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {
            !showCreateGameInput && (
              <div className="flex space-x-2">
                <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Oyun Kodunu Gir"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none text-black"
            />
            <Button
              onClick={joinGame}
              className="bg-lime-600 hover:bg-lime-700 flex items-center gap-1 h-auto"
            >
                  Katıl
                  <PlusIcon className="w-4 h-4" />
                </Button>
              </div>
            )
          }
        </div>

        <Modal
          isOpen={showNameInput}
          onClose={() => setShowNameInput(false)}
        >
          <div className="space-y-4">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="İsminizi girin"
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:outline-none"
              autoFocus
            />
            <div className="flex space-x-2">
              <Button
                onClick={sendJoinRequest}
                className="flex-1 bg-lime-600 hover:bg-lime-700 text-white flex items-center gap-1"
              >
                İstek Gönder
                <CheckIcon className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setShowNameInput(false)}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1"
              >
                İptal
                <XMarkIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Modal>

        {activeGames.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">
                Aktif Oyunlar
            </h2>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {activeGames.map((game) => (
                <div
                  key={game.code}
                  className="border rounded-lg p-4 hover:border-blue-500 transition-colors"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      game.isStarted ? "bg-green-300 text-green-800" : "bg-green-100 text-green-800"
                    }`}>
                      {game.isStarted ? "Oyun Başladı" : "Bekliyor"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    <p className="font-bold">Admin: {game.adminName}</p>
                    <p className="font-bold">Oyuncular: {game.playerCount}</p>
                    {game.currentQuestion && (
                      <p className="mt-2 font-medium text-blue-600 bg-blue-100 p-2 rounded-md">
                        Güncel Soru: {game.currentQuestion}
                      </p>
                    )}
                  </div>
                  {!game.isEnded && (
                    <Button
                      onClick={() => handleJoinRequest(game.code)}
                      className="w-full mt-2 bg-lime-600 hover:bg-lime-700 text-white flex items-center gap-1"
                      disabled={game.pendingRequests.some(r => r.name === playerName)}
                    >
                      {game.pendingRequests.some(r => r.name === playerName)
                        ? "İstek Gönderildi"
                        : "Katılmak İstiyorum"}
                    
                        <PlusIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
} 