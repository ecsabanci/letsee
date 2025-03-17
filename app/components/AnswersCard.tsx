import { Button } from "./ui/button"

interface Player {
  id: string
  name: string
  answer: string
  isReady: boolean
  isAdmin: boolean
}

interface AnswersCardProps {
  players: Player[]
  isAdmin: boolean
  onStartNewRound: () => void
}

export function AnswersCard({ players, isAdmin, onStartNewRound }: AnswersCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-4 animate-slide-in">
      <h2 className="text-xl font-bold mb-4">Cevaplar</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map((player, index) => (
          <div
            key={player.id}
            style={{ animationDelay: `${index * 0.1}s` }}
            className="bg-emerald-500 text-black rounded-lg p-4 space-y-2 animate-bounce-in"
          >
            <div className="font-bold">{player.name}</div>
            <div className="text-gray-800">{player.answer}</div>
          </div>
        ))}
      </div>
      {isAdmin && (
        <Button
          onClick={onStartNewRound}
          className="w-full mt-4 bg-blue-600 text-white hover:bg-blue-700"
        >
          Yeni Tur Başlat
        </Button>
      )}
    </div>
  )
} 