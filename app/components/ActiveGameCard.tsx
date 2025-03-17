import { Button } from "./ui/button"
import { HandRaisedIcon, ClockIcon } from "@heroicons/react/24/outline"

interface ActiveGameProps {
  code: string
  isStarted: boolean
  adminName: string
  playerCount: number
  currentQuestion?: string
  isEnded: boolean
  pendingRequests: Array<{
    id: string
    name: string
    timestamp: number
  }>
  playerName?: string
  onJoinRequest: (code: string) => void
}

export function ActiveGameCard({
  code,
  isStarted,
  adminName,
  playerCount,
  currentQuestion,
  isEnded,
  pendingRequests,
  playerName,
  onJoinRequest
}: ActiveGameProps) {
  const isPending = playerName ? pendingRequests.some(r => r.name === playerName) : false

  return (
    <div className="border rounded-lg p-4 hover:border-blue-500 transition-colors animate-fade-in">
      <div className="flex justify-between items-center mb-2">
        <span className={`px-2 py-1 rounded text-sm ${
          isStarted ? "bg-green-300 text-green-800" : "bg-green-100 text-green-800"
        }`}>
          {isStarted ? "Oyun Başladı" : "Bekliyor"}
        </span>
      </div>
      <div className="text-sm text-gray-400">
        <p className="font-bold">Admin: {adminName}</p>
        <p className="font-bold">Oyuncular: {playerCount}</p>
        {currentQuestion && (
          <p className="mt-2 font-medium text-blue-600 bg-blue-100 p-2 rounded-md">
            Güncel Soru: {currentQuestion}
          </p>
        )}
      </div>
      {!isEnded && (
        <Button
          onClick={() => onJoinRequest(code)}
          className="w-full mt-2 bg-lime-600 hover:bg-lime-700 text-white flex items-center gap-1"
          disabled={isPending}
        >
          {isPending ? "İstek Gönderildi" : "Katılmak İstiyorum"}
          {isPending ? (
            <ClockIcon className="w-4 h-4" />
          ) : (
            <HandRaisedIcon className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  )
} 