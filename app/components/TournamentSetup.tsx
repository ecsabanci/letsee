"use client"

import { useState } from "react"
import { Button } from "./Button"
import tournamentData from "../data/tournament-categories.json"
import { TournamentOption, TournamentCategory } from '@/types/tournament'

interface TournamentSetupProps {
  onStartTournament: (category: TournamentCategory) => void
}

export function TournamentSetup({ onStartTournament }: TournamentSetupProps) {
  const [selectedCategory, setSelectedCategory] = useState<TournamentCategory | null>(null)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Turnuva Kategorisi Seçin</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tournamentData.categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedCategory?.id === category.id
                ? "border-sky-500 bg-sky-500/20"
                : "border-gray-600 hover:border-gray-400"
            }`}
          >
            <h3 className="text-lg font-semibold text-white">{category.name}</h3>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {category.options
                .filter((option): option is TournamentOption & { imageUrl: string } => 
                  'imageUrl' in option && typeof option.imageUrl === 'string'
                )
                .slice(0, 4)
                .map((option) => (
                  <img
                    key={option.id}
                    src={option.imageUrl}
                    alt={option.title}
                    className="w-full h-16 object-cover rounded"
                  />
                ))}
              {category.options.every(option => !('imageUrl' in option)) && (
                <div className="col-span-4 bg-gray-800 rounded p-2 text-center text-sm text-gray-400">
                  Video Koleksiyonu
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      <Button
        onClick={() => selectedCategory && onStartTournament(selectedCategory)}
        disabled={!selectedCategory}
        className="w-full bg-sky-600 text-white hover:bg-sky-700 disabled:bg-gray-600"
      >
        Turnuvayı Başlat
      </Button>
    </div>
  )
} 