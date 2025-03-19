"use client"

import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react"
import { TournamentMatch } from "./TournamentMatch"
import { TournamentWinner } from "./TournamentWinner"
import { Socket } from "socket.io-client"
import { Modal } from "./ui/modal"
import { Button } from "./ui/button"
import { PaperAirplaneIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline"
import { PlayersList } from "./PlayersList"
import { EmojiBar } from "./EmojiBar"

interface TournamentOption {
  id: string
  title: string
  imageUrl: string
}

interface TournamentCategory {
  id: string
  name: string
  options: TournamentOption[]
}

interface Match {
  id: string
  round: number
  option1: TournamentOption
  option2: TournamentOption
  votes: { [key: string]: number }
  votedPlayers: string[]
}

interface ChatMessage {
  id: string
  playerName: string
  message: string
  timestamp: number
}

interface Player {
  id: string
  name: string
  isReady: boolean
  isAdmin: boolean
}

interface TournamentProps {
  category: TournamentCategory
  onTournamentEnd: (winner: TournamentOption) => void
  socket: Socket | null
  gameCode: string
}

const ROUND_NAMES: { [key: number]: string } = {
  1: "İlk Eleme Turu",
  2: "Çeyrek Final",
  3: "Yarı Final",
  4: "Final"
}

interface ChatMessageProps {
  message: ChatMessage
}

const ChatMessageItem = memo(function ChatMessageItem({ message }: ChatMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const shouldShowExpandButton = message.message.length > 50

  return (
    <div className="animate-fade-in bg-gray-700/50 p-3 rounded-lg w-full">
      <div className="flex items-start gap-2 w-full">
        <span className="font-bold text-sky-400 whitespace-nowrap flex-shrink-0">{message.playerName}:</span>
        <div className="flex-1 min-w-0 flex items-start gap-1">
          <p className={`text-gray-200 break-all ${!isExpanded ? 'line-clamp-1' : ''} flex-1`}>
            {message.message}
          </p>
          {shouldShowExpandButton && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-white transition-colors flex-shrink-0 mt-1"
              title={isExpanded ? "Küçült" : "Devamını Gör"}
            >
              {isExpanded ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

function arePropsEqual(prevProps: TournamentProps, nextProps: TournamentProps) {
  return (
    prevProps.category.id === nextProps.category.id &&
    prevProps.gameCode === nextProps.gameCode &&
    prevProps.socket?.id === nextProps.socket?.id
  )
}

export const Tournament = memo(function Tournament({ category, onTournamentEnd, socket, gameCode }: TournamentProps) {
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null)
  const [currentRound, setCurrentRound] = useState(1)
  const [winners, setWinners] = useState<TournamentOption[]>([])
  const [showingResults, setShowingResults] = useState(false)
  const [votingProgress, setVotingProgress] = useState({ voted: 0, total: 0 })
  const [tournamentWinner, setTournamentWinner] = useState<TournamentOption | null>(null)
  const [totalRounds, setTotalRounds] = useState(0)
  const [remainingMatches, setRemainingMatches] = useState(0)
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [showTieModal, setShowTieModal] = useState(false)
  const [tieOptions, setTieOptions] = useState<{ option1: TournamentOption, option2: TournamentOption } | null>(null)
  const [timeLeft, setTimeLeft] = useState(60)
  const [players, setPlayers] = useState<Player[]>([])
  const [isAdmin] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get("isAdmin") === "true"
  })
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Chat mesajı alma handler'ı
  const handleChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages(prev => [...prev, message])
  }, [])

  // Yeni katılan oyuncu kontrolü
  const isNewPlayer = useMemo(() => {
    if (!currentMatch || !currentMatch.votedPlayers || !socket?.id) return false
    const votedPlayers = Array.isArray(currentMatch.votedPlayers) ? 
      currentMatch.votedPlayers : 
      Object.values(currentMatch.votedPlayers || {})
    return !votedPlayers.includes(socket.id)
  }, [currentMatch?.votedPlayers, socket?.id])

  const handleVote = useCallback((matchId: string, winnerId: string) => {
    if (!socket || !currentMatch) return

    socket.emit("tournamentVote", {
      gameCode,
      matchId,
      optionId: winnerId
    })
  }, [socket, currentMatch, gameCode])

  // Eşitlik durumu için geri sayım
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (showTieModal && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [showTieModal, timeLeft])

  // Event handler'ları useCallback ile optimize et
  const handleTournamentStart = useCallback((data: { 
    category: TournamentCategory,
    totalRounds: number,
    totalParticipants: number
  }) => {
    setTotalRounds(data.totalRounds)
    setTotalParticipants(data.totalParticipants)
  }, [])

  const handleTournamentMatches = useCallback((data: { 
    match: Match, 
    round: number,
    winners: TournamentOption[],
    totalRounds: number,
    remainingMatches: number
  }) => {
    setCurrentMatch(data.match)
    setCurrentRound(data.round)
    setWinners(data.winners)
    setShowingResults(false)
    setVotingProgress({ voted: 0, total: 0 })
    setTotalRounds(data.totalRounds)
    setRemainingMatches(data.remainingMatches)
  }, [])

  const handleTournamentEnd = useCallback((winner: TournamentOption) => {
    setTournamentWinner(winner)
    setTimeout(() => {
      onTournamentEnd(winner)
    }, 5000)
  }, [onTournamentEnd])

  const handleTournamentTie = useCallback((data: {
    option1: TournamentOption
    option2: TournamentOption
    votes: { [key: string]: number }
  }) => {
    setTieOptions({ option1: data.option1, option2: data.option2 })
    setShowTieModal(true)
    setTimeLeft(60)
  }, [])

  const handleTournamentTieEnd = useCallback((data: {
    match: Match
    round: number
    winners: TournamentOption[]
    totalRounds: number
    remainingMatches: number
  }) => {
    setShowTieModal(false)
    setTieOptions(null)
    setCurrentMatch(data.match)
    setShowingResults(false)
    setVotingProgress({ voted: 0, total: 0 })
    setChatMessages([])
  }, [])

  const handleTournamentVote = useCallback(({ matchId, optionId, votes, votedPlayers, votedPlayerCount, totalPlayerCount }: any) => {
    if (currentMatch?.id === matchId) {
      setCurrentMatch(prev => prev ? {
        ...prev,
        votes: votes,
        votedPlayers: votedPlayers || []
      } : null)
      setVotingProgress({ voted: votedPlayerCount, total: totalPlayerCount })
      if (votedPlayerCount === totalPlayerCount) {
        setShowingResults(true)
      }
    }
  }, [currentMatch?.id])

  // Socket event'lerini bağla
  useEffect(() => {
    if (!socket) return

    socket.emit("requestTournamentMatches", {
      gameCode,
      category
    })

    socket.on("tournamentStarted", handleTournamentStart)
    socket.on("tournamentMatches", handleTournamentMatches)
    socket.on("tournamentEnded", handleTournamentEnd)
    socket.on("tournamentTie", handleTournamentTie)
    socket.on("tournamentTieEnd", handleTournamentTieEnd)
    socket.on("tournamentVote", handleTournamentVote)
    socket.on("tournamentChatMessage", handleChatMessage)

    return () => {
      socket.off("tournamentStarted", handleTournamentStart)
      socket.off("tournamentMatches", handleTournamentMatches)
      socket.off("tournamentEnded", handleTournamentEnd)
      socket.off("tournamentTie", handleTournamentTie)
      socket.off("tournamentTieEnd", handleTournamentTieEnd)
      socket.off("tournamentVote", handleTournamentVote)
      socket.off("tournamentChatMessage", handleChatMessage)
    }
  }, [
    socket,
    category,
    gameCode,
    handleTournamentStart,
    handleTournamentMatches,
    handleTournamentEnd,
    handleTournamentTie,
    handleTournamentTieEnd,
    handleTournamentVote,
    handleChatMessage
  ])

  const handleEndTie = useCallback(() => {
    if (socket && isAdmin) {
      socket.emit("endTournamentTie", { gameCode })
      setChatMessages([])
    }
  }, [socket, gameCode, isAdmin])

  // Yeni chat mesajı geldiğinde otomatik scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages])

  // Chat mesajı gönderme fonksiyonu
  const handleSendMessage = useCallback((message: string) => {
    if (!socket || !message.trim()) return

    const chatMessage = {
      gameCode,
      message: message.trim(),
      timestamp: Date.now(),
      id: Math.random().toString(36).substring(2)
    }

    socket.emit("tournamentChatMessage", chatMessage)
  }, [socket, gameCode])

  // Oyuncuları güncelleme
  useEffect(() => {
    if (!socket) return

    const handlePlayersUpdate = (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers)
    }

    socket.on("playersUpdate", handlePlayersUpdate)

    return () => {
      socket.off("playersUpdate", handlePlayersUpdate)
    }
  }, [socket])

  if (tournamentWinner) {
    return <TournamentWinner winner={tournamentWinner} />
  }

  if (!currentMatch) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">Turnuva Hazırlanıyor...</h2>
        <p className="text-gray-400">Eşleşmeler oluşturuluyor, lütfen bekleyin.</p>
      </div>
    )
  }

  if (isNewPlayer && showingResults) {
    return (
      <div className="text-center py-8 space-y-4">
        <h2 className="text-2xl font-bold mb-4">Hoş Geldiniz!</h2>
        <div className="bg-yellow-500/20 rounded-lg p-6 max-w-2xl mx-auto">
          <p className="text-yellow-400 text-lg mb-4">
            ⚠️ Mevcut oylama tamamlandı
          </p>
          <p className="text-gray-400">
            Bir sonraki maç başladığında oylamaya katılabileceksiniz. Lütfen bekleyin...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="text-gray-400 text-xs space-y-1">
          <p>
            Kalan Eşleşme: {remainingMatches + 1}
          </p>
          {showingResults && (
            <p>
              Sonuçlar gösteriliyor
            </p>
          )}
        </div>
      </div>

      <TournamentMatch
        key={currentMatch.id}
        option1={currentMatch.option1}
        option2={currentMatch.option2 || currentMatch.option1}
        onVote={(winnerId) => handleVote(currentMatch.id, winnerId)}
        votes={currentMatch.votes}
        showResults={showingResults}
        className="max-w-2xl mx-auto"
        isWalkover={!currentMatch.option2}
      />

      {/* Eşitlik Durumu Modalı */}
      <Modal
        isOpen={showTieModal}
        onClose={() => {}}
      >
        <div className="space-y-2 text-xs max-h-[100vh] overflow-y-auto">
          <div className="bg-yellow-500 rounded-lg p-3">
            <p className="font-semibold">
              ⚠️ Oylar eşit çıktı! ({tieOptions?.option1.title} - {tieOptions?.option2.title})
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4">
            <span className="block text-yellow-400">
              Yeni oylama {timeLeft} saniye sonra başlayacak.
            </span>
          </div>

          {/* Chat alanı */}
          <div 
            ref={chatContainerRef}
            className="h-80 bg-gray-800 text-xs rounded-lg p-6 overflow-y-auto space-y-3"
          >
            {chatMessages.map((msg) => (
              <ChatMessageItem key={msg.id} message={msg} />
            ))}
            {chatMessages.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500 text-center">
                  Şimdi tartışmaya başlayın!
                </p>
              </div>
            )}
          </div>

          {/* Mesaj gönderme alanı */}
          <div className="flex items-center gap-1">
            <textarea
              placeholder="Mesajınızı yazın..."
              className="flex-1 px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-sky-500 text-xs resize-none"
              rows={2}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage((e.target as HTMLTextAreaElement).value)
                  ;(e.target as HTMLTextAreaElement).value = ''
                }
              }}
            />
            <Button
              onClick={() => {
                const textarea = document.querySelector('textarea') as HTMLTextAreaElement
                if (textarea) {
                  handleSendMessage(textarea.value)
                  textarea.value = ''
                }
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white rounded-full p-2 flex items-center justify-center gap-2"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </Button>
          </div>

          {isAdmin && (
            <Button
              onClick={handleEndTie}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center gap-2 py-4 text-lg"
            >
              Yeni Oylamayı Başlat
              <XMarkIcon className="w-6 h-6" />
            </Button>
          )}
        </div>
      </Modal>
    </div>
  )
}, arePropsEqual) 