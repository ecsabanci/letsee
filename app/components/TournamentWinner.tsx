import Image from "next/image"

interface TournamentOption {
  id: string
  title: string
  imageUrl: string,
  videoUrl: string
}

interface TournamentWinnerProps {
  winner: TournamentOption
}

export function TournamentWinner({ winner }: TournamentWinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold text-center mb-8 text-yellow-400">
        🏆 Turnuva Şampiyonu 🏆
      </h2>
      
      <div className="relative w-60 h-60 mb-8">
        <div className="absolute inset-0 bg-yellow-500 rounded-full animate-pulse-slow opacity-25" />
        <div className="relative w-full h-full rounded-full overflow-hidden border-8 border-yellow-400 shadow-2xl">
          <Image
            src={winner.imageUrl}
            alt={winner.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      <h3 className="text-3xl font-bold text-center text-white mb-4 animate-bounce-in">
        {winner.title}
      </h3>
    </div>
  )
} 