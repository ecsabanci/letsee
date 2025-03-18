import { useState } from 'react'
import { Modal } from './ui/modal'
import { Button } from './ui/button'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Player {
  id: string
  name: string
  isReady: boolean
  isAdmin: boolean
}

interface PlayersListProps {
  players?: Player[]
  gameStarted: boolean
  readyCount: number
  totalCount: number
  isTournament?: boolean
  votingProgress?: {
    voted: number
    total: number
  }
  currentPlayerId?: string
}

export function PlayersList({
  players = [],
  gameStarted,
  readyCount,
  totalCount,
  isTournament = false,
  votingProgress,
  currentPlayerId
}: PlayersListProps) {
  const [showAllPlayers, setShowAllPlayers] = useState(false)

  // Admin ve mevcut oyuncuyu bul
  const admin = players.find(p => p.isAdmin)
  const currentPlayer = players.find(p => p.id === currentPlayerId)
  
  // Gösterilecek oyuncuları belirle
  const displayedPlayers = players.filter(p => 
    p.isAdmin || p.id === currentPlayerId
  )
  
  // Diğer oyuncuların sayısı
  const remainingCount = players.length - displayedPlayers.length

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-center">
        {/* Admin ve mevcut oyuncuyu göster */}
        {displayedPlayers.map((player) => (
          <div
            key={player.id}
            className={`px-3 py-1 rounded-full text-sm border-2 animate-bounce-in ${
              (!isTournament && player.isReady) ? "bg-teal-400" : "bg-gray-800"
            } ${player.isAdmin ? "border-sky-600" : "border-gray-600"} ${
              (!isTournament && player.isReady) ? "animate-pulse-slow" : ""
            }`}
          >
            {player.name} {player.isAdmin ? "(Admin)" : ""}
          </div>
        ))}

        {/* Diğer oyuncular için buton */}
        {remainingCount > 0 && (
          <Button
            onClick={() => setShowAllPlayers(true)}
            className="px-3 py-1 rounded-full text-sm bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            ve {remainingCount} kişi daha
          </Button>
        )}
      </div>

      {gameStarted && (
        <div className="mt-4 text-sm text-gray-400">
          {isTournament ? (
            votingProgress ? (
              `${votingProgress.voted} / ${votingProgress.total} oyuncu oy kullandı`
            ) : (
              "Oylama bekleniyor..."
            )
          ) : (
            `${readyCount} / ${totalCount} oyuncu hazır`
          )}
        </div>
      )}

      {/* Tüm oyuncuları gösteren modal */}
      <Modal
        isOpen={showAllPlayers}
        onClose={() => setShowAllPlayers(false)}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
            {players.map((player) => (
              <div
                key={player.id}
                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  (!isTournament && player.isReady) ? "bg-teal-400" : "bg-gray-700"
                } ${player.isAdmin ? "border-l-4 border-sky-600" : ""}`}
              >
                {player.name} {player.isAdmin ? "(Admin)" : ""}
                {player.id === currentPlayerId ? " (Sen)" : ""}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
} 