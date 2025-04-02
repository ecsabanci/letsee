export interface TournamentOption {
  id: string
  title: string
  imageUrl?: string
  videoUrl?: string
}

export interface TournamentCategory {
  id: string
  name: string
  options: TournamentOption[]
}

export interface Match {
  id: string
  round: number
  option1: TournamentOption
  option2: TournamentOption
  votes: { [key: string]: number }
  votedPlayers: string[]
}

export interface Player {
  id: string
  name: string
  answer: string
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