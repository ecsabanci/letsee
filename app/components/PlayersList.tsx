interface Player {
  id: string
  name: string
  isReady: boolean
  isAdmin: boolean
}

interface PlayersListProps {
  players: Player[]
  gameStarted: boolean
  readyCount: number
  totalCount: number
}

export function PlayersList({
  players,
  gameStarted,
  readyCount,
  totalCount
}: PlayersListProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {players.map((player) => (
          <div
            key={player.id}
            className={`px-3 py-1 rounded-full text-sm border-2 animate-bounce-in ${
              player.isReady ? "bg-teal-400" : "bg-gray-800"
            } ${player.isAdmin ? "border-sky-600" : "border-gray-600"} ${
              player.isReady ? "animate-pulse-slow" : ""
            }`}
          >
            {player.name} {player.isAdmin ? "(Admin)" : ""}
          </div>
        ))}
      </div>
      {gameStarted && (
        <div className="mt-4 text-sm text-gray-600">
          {readyCount} / {totalCount} oyuncu hazır
        </div>
      )}
    </div>
  )
} 