import { useState, useEffect } from 'react'

interface EmojiBarProps {
  onEmojiClick: (emoji: string) => void
  className?: string
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '👏', '🎉', '💩']
const COOLDOWN_TIME = 5000 // 5 saniye

export function EmojiBar({ onEmojiClick, className = '' }: EmojiBarProps) {
  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({})

  const handleEmojiClick = (emoji: string) => {
    if (cooldowns[emoji]) return

    onEmojiClick(emoji)
    
    setCooldowns(prev => ({ ...prev, [emoji]: true }))
    setTimeout(() => {
      setCooldowns(prev => ({ ...prev, [emoji]: false }))
    }, COOLDOWN_TIME)
  }

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800/80 backdrop-blur-sm 
      px-4 py-2 rounded-full shadow-lg border border-gray-700 ${className}`}>
      <div className="flex gap-5">
        {EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => handleEmojiClick(emoji)}
            disabled={cooldowns[emoji]}
            className={`text-2xl transition-transform hover:scale-125 
              ${cooldowns[emoji] ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
} 