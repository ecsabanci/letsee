export interface TournamentOption {
  id: string
  name: string
  imageUrl?: string,
  videoUrl?: string
}

export interface Match {
  id: string
  option1: TournamentOption
  option2: TournamentOption
  votes: { [key: string]: number }
  votedPlayers: string[]
}

export interface Player {
  id: string
  name: string
  isReady: boolean
  isAdmin: boolean
}

export interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  message: string
  timestamp: number
} 