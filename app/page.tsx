"use client"

import { useState } from "react"
import { Button } from "./components/ui/button"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState("")

  const createGame = async () => {
    const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    router.push(`/game/${gameCode}?isAdmin=true`)
  }

  const joinGame = () => {
    if (joinCode.trim()) {
      router.push(`/game/${joinCode.toUpperCase()}`)
    }
  }

  return (
    <main className="flex min-h-screen bg-red-500 flex-col items-center justify-center p-24 bg-gradient-to-b from-blue-100 to-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Oyun Zamanı!</h1>
          <p className="text-gray-600">Yeni bir oyun oluştur veya mevcut bir oyuna katıl</p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={createGame}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Yeni Oyun Oluştur
          </Button>

          <div className="flex space-x-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Oyun Kodunu Gir"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              onClick={joinGame}
              className="bg-green-600 hover:bg-green-700"
            >
              Katıl
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
} 