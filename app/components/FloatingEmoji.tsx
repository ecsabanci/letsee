interface FloatingEmojiProps {
  emoji: string
  playerName: string
}

export function FloatingEmoji({ emoji, playerName }: FloatingEmojiProps) {
  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 animate-float-up pointer-events-none">
      <div className="flex flex-col items-center">
        <span className="text-3xl">{emoji}</span>
        <span className="text-xs text-gray-400">{playerName}</span>
      </div>
    </div>
  )
} 