"use client"

import { useState, useMemo, memo, useEffect } from 'react'
import Image from "next/image"

interface TournamentOption {
  id: string
  title: string
  imageUrl: string
}

interface TournamentMatchProps {
  option1: TournamentOption
  option2: TournamentOption
  onVote: (winnerId: string) => void
  timeLimit?: number // saniye cinsinden
  votes: Record<string, number>
  showResults?: boolean
  className?: string
  isWalkover?: boolean // Rakipsiz maç durumu
}

export const TournamentMatch = memo(function TournamentMatch({
  option1,
  option2,
  onVote,
  votes = {},
  showResults = false,
  className = "",
  isWalkover = false
}: TournamentMatchProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  // Güvenlik kontrolü ekleyelim
  if (!option1?.id || !option2?.id) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Maç bilgileri yükleniyor...</p>
      </div>
    )
  }

  // Oylar sıfırlandığında seçimi de sıfırla
  useEffect(() => {
    if (Object.keys(votes).length === 0) {
      setSelectedOption(null)
    }
  }, [votes])

  const totalVotes = useMemo(() => {
    return (votes[option1.id] || 0) + (votes[option2.id] || 0)
  }, [votes, option1.id, option2.id])
  
  const getVotePercentage = useMemo(() => {
    return (optionId: string) => {
      if (totalVotes === 0) return 0
      const optionVotes = votes[optionId] || 0
      return Math.round((optionVotes / totalVotes) * 100)
    }
  }, [totalVotes, votes])

  const handleOptionClick = (optionId: string) => {
    if (selectedOption || showResults || isWalkover) return
    setSelectedOption(optionId)
    onVote(optionId)
  }

  const option1VotePercentage = useMemo(() => 
    showResults ? getVotePercentage(option1.id) : null
  , [showResults, getVotePercentage, option1.id])

  const option2VotePercentage = useMemo(() => 
    showResults ? getVotePercentage(option2.id) : null
  , [showResults, getVotePercentage, option2.id])

  return (
    <div className={`relative ${className}`}>
      {isWalkover && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black bg-opacity-50 rounded-lg">
          <div className="bg-green-600 text-white px-6 py-3 rounded-full text-lg font-bold animate-bounce-in">
            Rakipsiz Tur Atlıyor
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-8">
        {/* Seçenek 1 */}
        <div 
          className={`relative cursor-pointer transition-transform duration-200 ${
            selectedOption === option1.id ? 'scale-105 ring-4 ring-sky-500' : 'hover:scale-105'
          } ${isWalkover ? 'opacity-50' : ''}`}
          onClick={() => handleOptionClick(option1.id)}
        >
          {/* Oy sayısı rozeti */}
          {votes[option1.id] > 0 && !showResults && (
            <div className="absolute top-2 right-2 bg-sky-500 text-white px-2 py-1 rounded-full text-sm font-bold z-10 animate-bounce-in">
              {votes[option1.id]}
            </div>
          )}
          <div className="relative aspect-square rounded-lg overflow-hidden">
            <Image
              src={option1.imageUrl}
              alt={option1.title}
              className="w-full h-full object-cover"
              width={400}
              height={400}
              priority
            />
            {showResults && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <span className="text-6xl font-bold text-white">
                  {option1VotePercentage}%
                </span>
              </div>
            )}
          </div>
          <h3 className="text-xl font-medium text-center mt-4 text-white">
            {option1.title}
          </h3>
        </div>

        {/* VS */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">VS</span>
          </div>
        </div>

        {/* Seçenek 2 */}
        <div 
          className={`relative cursor-pointer transition-transform duration-200 ${
            selectedOption === option2.id ? 'scale-105 ring-4 ring-sky-500' : 'hover:scale-105'
          } ${isWalkover ? 'opacity-25' : ''}`}
          onClick={() => handleOptionClick(option2.id)}
        >
          {/* Oy sayısı rozeti */}
          {votes[option2.id] > 0 && !showResults && (
            <div className="absolute top-2 right-2 bg-sky-500 text-white px-2 py-1 rounded-full text-sm font-bold z-10 animate-bounce-in">
              {votes[option2.id]}
            </div>
          )}
          <div className="relative aspect-square rounded-lg overflow-hidden">
            <Image
              src={option2.imageUrl}
              alt={option2.title}
              className="w-full h-full object-cover"
              width={400}
              height={400}
              priority
            />
            {showResults && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <span className="text-6xl font-bold text-white">
                  {option2VotePercentage}%
                </span>
              </div>
            )}
          </div>
          <h3 className="text-xl font-medium text-center mt-4 text-white">
            {option2.title}
          </h3>
        </div>
      </div>
    </div>
  )
}) 