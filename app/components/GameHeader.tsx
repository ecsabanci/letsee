import { Button } from "./ui/button"
import { ClipboardDocumentIcon, UserPlusIcon } from "@heroicons/react/24/outline"
import { toast } from "react-hot-toast"

interface GameHeaderProps {
  gameCode: string
  isAdmin: boolean
  joinRequestCount: number
  onShowJoinRequests: () => void
  onEndGame: () => void
}

export function GameHeader({
  gameCode,
  isAdmin,
  joinRequestCount,
  onShowJoinRequests,
  onEndGame
}: GameHeaderProps) {
  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(gameCode)
    toast.success('Oyun kodu kopyalandı!', {
      duration: 2000,
      position: 'top-center',
      style: {
        background: '#4CAF50',
        color: '#fff',
      },
    })
  }

  return (
    <div>
      {isAdmin && (
        <div className="flex items-center justify-between">
          <Button
            onClick={onEndGame}
            className="bg-rose-500 text-xs hover:bg-rose-600 text-white mb-4 animate-bounce-in"
          >
            Oyunu Sonlandır
          </Button>
          <Button
            onClick={onShowJoinRequests}
            className="bg-lime-600 text-xs hover:bg-lime-700 text-white mb-4 flex items-center gap-2 animate-bounce-in relative"
          >
            <UserPlusIcon className="w-4 h-4" />
            {joinRequestCount}
            {joinRequestCount > 0 && (
            <span className="absolute flex size-2 -right-1 -top-1">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-yellow-500"></span>
            </span>
            )}
          </Button>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h1 className="font-bold">
            Oyun Kodu: <span className="text-teal-600">{gameCode}</span>
          </h1>
          <button
            onClick={handleCopyCode}
            className="ml-4 hover:text-teal-600 transition-colors"
          >
            <ClipboardDocumentIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
} 