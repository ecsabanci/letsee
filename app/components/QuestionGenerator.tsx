import { useState } from 'react'
import { Button } from "./ui/button"
import { SparklesIcon } from "@heroicons/react/24/outline"

interface QuestionGeneratorProps {
  onQuestionGenerated: (question: string) => void
}

const CATEGORIES = [
  "Genel Kültür",
  "Tarih",
  "Bilim",
  "Teknoloji",
  "Sanat",
  "Spor",
  "Coğrafya",
  "Eğlence",
  "Yemek ve Mutfak",
  "Film ve Dizi"
]

export function QuestionGenerator({ onQuestionGenerated }: QuestionGeneratorProps) {
  const [selectedCategory, setSelectedCategory] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const generateQuestion = async () => {
    if (!selectedCategory) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/generate-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: selectedCategory }),
      })

      const data = await response.json()
      if (data.question) {
        onQuestionGenerated(data.question)
      }
    } catch (error) {
      console.error('Soru üretilirken hata:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <select
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-black focus:outline-none bg-white"
      >
        <option value="">Kategori Seçin</option>
        {CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <Button
        onClick={generateQuestion}
        disabled={!selectedCategory || isLoading}
        className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 h-auto"
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
        ) : (
          <div className="flex items-center gap-2">
            Soru Üret
            <SparklesIcon className="w-5 h-5" />
          </div>
        )}
      </Button>
    </div>
  )
} 