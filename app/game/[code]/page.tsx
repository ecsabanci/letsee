"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/app/components/ui/button"
import { io } from "socket.io-client"
import { Toaster, toast } from 'react-hot-toast'
import { useRouter } from "next/navigation"
import { Modal } from "@/app/components/ui/modal"
import { EmojiBar } from "@/app/components/EmojiBar"
import { FloatingEmoji } from "@/app/components/FloatingEmoji"
import { GameHeader } from "@/app/components/GameHeader"
import { PlayersList } from "@/app/components/PlayersList"
import { QuestionAnswerForm } from "@/app/components/QuestionAnswerForm"
import { AnswersCard } from "@/app/components/AnswersCard"
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline"
import { QuestionGenerator } from "@/app/components/QuestionGenerator"
import { TournamentSetup } from "@/app/components/TournamentSetup"
import { Tournament } from "@/app/components/Tournament"

// Socket.IO sunucu URL'ini ortama göre ayarla
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002"

interface JoinRequest {
  id: string
  name: string
  timestamp: number
}

interface Player {
  id: string
  name: string
  answer: string
  isReady: boolean
  isAdmin: boolean
}

interface JoinRequestApprovedData {
  gameCode: string
  currentGameState?: {
    question: string
    isStarted: boolean
    showingAnswers: boolean
    isTournament: boolean
    tournamentCategory?: TournamentCategory
  }
}

interface EmojiReaction {
  id: string
  emoji: string
  playerName: string
}

interface TournamentCategory {
  id: string
  name: string
  options: Array<{
    id: string
    title: string
    imageUrl: string
  }>
}

export default function GamePage({ params }: { params: { code: string } }) {
  const searchParams = useSearchParams()
  const isAdmin = searchParams.get("isAdmin") === "true"
  const [playerName, setPlayerName] = useState("")
  const [isNameSet, setIsNameSet] = useState(false)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [isReady, setIsReady] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [socket, setSocket] = useState<any>(null)
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const router = useRouter()
  const [showJoinRequests, setShowJoinRequests] = useState(false)
  const [emojiReactions, setEmojiReactions] = useState<EmojiReaction[]>([])
  const [isTournament, setIsTournament] = useState(false)
  const [tournamentCategory, setTournamentCategory] = useState<TournamentCategory | null>(null)
  const [votingProgress, setVotingProgress] = useState({ voted: 0, total: 0 })

  // Socket bağlantısını ve event listener'ları bir kere oluştur
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      query: { 
        gameCode: params.code,
        isAdmin: isAdmin.toString()
      },
    })

    const handlePlayerJoined = (players: Player[]) => {
      setPlayers(players)
    }

    const handleGameStarted = (question: string) => {
      setGameStarted(true)
      setShowAnswers(false)
      setQuestion(question)
      setIsReady(false)
      setAnswer("")
    }

    const handlePlayerReady = (players: Player[]) => {
      setPlayers(players)
    }

    const handleAnswersRevealed = (players: Player[]) => {
      setPlayers(players)
      setShowAnswers(true)
    }

    const handleRoundEnded = (players: Player[]) => {
      setPlayers(players)
      setIsReady(false)
      setAnswer("")
      setGameStarted(false)
      setShowAnswers(false)
      setQuestion("")
    }

    const handleJoinRequest = (data: any) => {
      setJoinRequests(data.requests)
      if (isAdmin) {
        toast.custom((t) => (
          <div className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Yeni Katılma İsteği
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {data.requests[data.requests.length - 1]?.name} oyuna katılmak istiyor
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
              >
                Kapat
              </button>
            </div>
          </div>
        ), {
          duration: 4000,
          position: 'top-right',
        })
      }
    }

    const handleGameEnded = () => {
      router.push("/")
    }

    const handleJoinRequestApproved = (data: JoinRequestApprovedData) => {
      if (data.currentGameState) {
        const { isStarted, showingAnswers, question, isTournament, tournamentCategory } = data.currentGameState
        
        if (isTournament && tournamentCategory) {
          setTournamentCategory(tournamentCategory)
          setIsTournament(true)
        }
        setGameStarted(isStarted)
        setShowAnswers(showingAnswers)
        setQuestion(question)
        
        if (isTournament && tournamentCategory) {
          newSocket.emit("requestTournamentMatches", {
            gameCode: data.gameCode,
            category: tournamentCategory
          })
        }
      }
    }

    const handleEmojiReaction = (reaction: EmojiReaction) => {
      setEmojiReactions(prev => [...prev, reaction])
      setTimeout(() => {
        setEmojiReactions(prev => prev.filter(r => r.id !== reaction.id))
      }, 2000)
    }

    const handleTournamentStarted = (category: TournamentCategory) => {
      setTournamentCategory(category)
      setIsTournament(true)
      setGameStarted(true)
    }

    const handleTournamentEnded = () => {
      setTimeout(() => {
        setIsTournament(false)
        setGameStarted(false)
        setTournamentCategory(null)
      }, 5000)
    }

    const handleTournamentVote = ({ votedPlayerCount, totalPlayerCount }: any) => {
      setVotingProgress({ voted: votedPlayerCount, total: totalPlayerCount })
    }

    newSocket.on("playerJoined", handlePlayerJoined)
    newSocket.on("gameStarted", handleGameStarted)
    newSocket.on("playerReady", handlePlayerReady)
    newSocket.on("answersRevealed", handleAnswersRevealed)
    newSocket.on("roundEnded", handleRoundEnded)
    newSocket.on("joinRequest", handleJoinRequest)
    newSocket.on("gameEnded", handleGameEnded)
    newSocket.on("joinRequestApproved", handleJoinRequestApproved)
    newSocket.on("emojiReaction", handleEmojiReaction)
    newSocket.on("tournamentStarted", handleTournamentStarted)
    newSocket.on("tournamentEnded", handleTournamentEnded)
    newSocket.on("tournamentVote", handleTournamentVote)

    setSocket(newSocket)

    return () => {
      if (newSocket) {
        newSocket.emit("leaveGame")
        newSocket.off("playerJoined", handlePlayerJoined)
        newSocket.off("gameStarted", handleGameStarted)
        newSocket.off("playerReady", handlePlayerReady)
        newSocket.off("answersRevealed", handleAnswersRevealed)
        newSocket.off("roundEnded", handleRoundEnded)
        newSocket.off("joinRequest", handleJoinRequest)
        newSocket.off("gameEnded", handleGameEnded)
        newSocket.off("joinRequestApproved", handleJoinRequestApproved)
        newSocket.off("emojiReaction", handleEmojiReaction)
        newSocket.off("tournamentStarted", handleTournamentStarted)
        newSocket.off("tournamentEnded", handleTournamentEnded)
        newSocket.off("tournamentVote", handleTournamentVote)
        newSocket.close()
      }
    }
  }, [params.code, isAdmin, router])

  // İsim kaydetme effect'ini ayrı tut ve sadece gerekli dependency'leri ekle
  useEffect(() => {
    const savedName = localStorage.getItem("playerName")
    if (savedName && isAdmin && socket) {
      setPlayerName(savedName)
      setIsNameSet(true)
      socket.emit("setName", savedName)
    }
  }, [isAdmin, socket])

  const handleSetName = () => {
    if (playerName.trim()) {
      localStorage.setItem("playerName", playerName)
      socket.emit("setName", playerName)
      setIsNameSet(true)
      
      // İsim ayarlandıktan sonra oyun durumunu kontrol et
      socket.once("joinRequestApproved", (data: JoinRequestApprovedData) => {
        if (data.currentGameState) {
          const { isStarted, showingAnswers, question, isTournament, tournamentCategory } = data.currentGameState
          
          // State'leri tek bir batch'te güncelle
          Promise.resolve().then(() => {
            if (isTournament && tournamentCategory) {
              setTournamentCategory(tournamentCategory)
              setIsTournament(true)
            }
            setGameStarted(isStarted)
            setShowAnswers(showingAnswers)
            setQuestion(question)
            
            // Turnuva durumunu güncelle
            if (isTournament && tournamentCategory) {
              socket.emit("requestTournamentMatches", {
                gameCode: params.code,
                category: tournamentCategory
              })
            }
          })
        }
      })
    }
  }

  const handleStartGame = () => {
    if (question.trim()) {
      socket.emit("startGame", question)
    }
  }

  const handleSubmitAnswer = () => {
    if (answer.trim()) {
      socket.emit("submitAnswer", answer)
      setIsReady(true)
    }
  }

  const handleStartNewRound = () => {
    socket.emit("startNewRound")
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(params.code)
    toast.success('Oyun kodu kopyalandı!', {
      duration: 2000,
      position: 'top-center',
      style: {
        background: '#4CAF50',
        color: '#fff',
      },
    })
  }

  const handleApproveRequest = (playerId: string) => {
    socket.emit("approveJoinRequest", {
      gameCode: params.code,
      playerId
    })
    setJoinRequests(prev => prev.filter(req => req.id !== playerId))
  }

  const handleRejectRequest = (playerId: string) => {
    socket.emit("rejectJoinRequest", {
      gameCode: params.code,
      playerId
    })
    setJoinRequests(prev => prev.filter(req => req.id !== playerId))
  }

  const handleEndGame = () => {
    if (socket) {
      socket.emit("endGame")
      router.push("/")
    }
  }

  const handleEmojiClick = (emoji: string) => {
    const reaction: EmojiReaction = {
      id: Math.random().toString(36).substring(2),
      emoji,
      playerName
    }
    socket.emit("sendEmojiReaction", reaction)
  }

  const handleStartTournament = (category: TournamentCategory) => {
    if (socket) {
      socket.emit("startTournament", {
        gameCode: params.code,
        category
      })
    }
  }

  const handleTournamentEnd = (winner: any) => {
    if (socket) {
      socket.emit("endTournament", {
        gameCode: params.code,
        winner
      })
    }
  }

  if (!isNameSet && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="İsminizi girin"
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:outline-none"
          />
          <Button onClick={handleSetName} className="w-full bg-sky-600 text-white hover:bg-sky-700">
            Oyuna Katıl
          </Button>
        </div>
      </div>
    )
  }

  const readyPlayerCount = players.filter(p => p.isReady).length
  const totalPlayerCount = players.length

  return (
    <div className="min-h-screen p-4 md:p-8">
      <Toaster />
      <div className="max-w-4xl mx-auto space-y-8 relative">
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 animate-fade-in">
          <GameHeader
            gameCode={params.code}
            isAdmin={isAdmin}
            joinRequestCount={joinRequests.length}
            onShowJoinRequests={() => setShowJoinRequests(true)}
            onEndGame={handleEndGame}
          />

          <PlayersList
            players={players}
            gameStarted={gameStarted}
            readyCount={readyPlayerCount}
            totalCount={totalPlayerCount}
            isTournament={isTournament}
            votingProgress={votingProgress}
          />
        </div>

        {isAdmin && !gameStarted && (
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-4 animate-slide-in">
            <div className="flex gap-4">
              <Button
                onClick={() => setIsTournament(false)}
                className={`flex-1 ${!isTournament ? 'bg-sky-600' : 'bg-gray-600'}`}
              >
                Soru-Cevap
              </Button>
              <Button
                onClick={() => setIsTournament(true)}
                className={`flex-1 ${isTournament ? 'bg-sky-600' : 'bg-gray-600'}`}
              >
                Turnuva
              </Button>
            </div>

            {isTournament ? (
              <TournamentSetup onStartTournament={handleStartTournament} />
            ) : (
              <>
                <QuestionGenerator onQuestionGenerated={setQuestion} />
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Sorunuzu yazın veya üretin"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:outline-none"
                />
                <Button onClick={handleStartGame} className="w-full bg-sky-600 text-white hover:bg-sky-700">
                  Oyunu Başlat
                </Button>
              </>
            )}
          </div>
        )}

        {gameStarted && isTournament && tournamentCategory && (
          <Tournament
            category={tournamentCategory}
            onTournamentEnd={handleTournamentEnd}
            socket={socket}
            gameCode={params.code}
          />
        )}

        {gameStarted && !isTournament && !showAnswers && (
          <QuestionAnswerForm
            question={question}
            answer={answer}
            onAnswerChange={setAnswer}
            onSubmit={handleSubmitAnswer}
            isReady={isReady}
          />
        )}

        {showAnswers && !isTournament && (
          <AnswersCard
            players={players}
            isAdmin={isAdmin}
            onStartNewRound={handleStartNewRound}
          />
        )}

        <Modal
          isOpen={showJoinRequests}
          onClose={() => setShowJoinRequests(false)}
        >
          <div className="space-y-4">
            {joinRequests.length === 0 ? (
              <p className="text-center text-gray-500">Henüz katılma isteği yok</p>
            ) : (
              joinRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <span className="font-medium text-gray-900">{request.name}</span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        handleApproveRequest(request.id)
                        setShowJoinRequests(false)
                      }}
                      className="bg-lime-600 hover:bg-lime-700"
                    >
                      <CheckCircleIcon className="w-6 h-6" />
                    </Button>
                    <Button
                      onClick={() => {
                        handleRejectRequest(request.id)
                        setShowJoinRequests(false)
                      }}
                      className="bg-rose-500 hover:bg-rose-600"
                    >
                      <XCircleIcon className="w-6 h-6" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>

        {/* Emoji Reactions */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {emojiReactions.map((reaction) => (
            <FloatingEmoji
              key={reaction.id}
              emoji={reaction.emoji}
              playerName={reaction.playerName}
            />
          ))}
        </div>

        {/* Emoji Bar */}
        {/* {isNameSet && <EmojiBar onEmojiClick={handleEmojiClick} />} */}
      </div>
    </div>
  )
} 