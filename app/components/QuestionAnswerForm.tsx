import { Button } from "./ui/button"
import { CheckCircleIcon } from "@heroicons/react/24/outline"

interface QuestionAnswerFormProps {
  question: string
  answer: string
  onAnswerChange: (answer: string) => void
  onSubmit: () => void
  isReady: boolean
}

export function QuestionAnswerForm({
  question,
  answer,
  onAnswerChange,
  onSubmit,
  isReady
}: QuestionAnswerFormProps) {
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-4 animate-slide-in">
      <div className="font-bold text-lg">{question}</div>
      {!isReady && (
        <>
          <textarea
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Cevabınızı yazın"
            className="w-full px-4 py-2 border border-gray-300 rounded-md h-32 text-black focus:outline-none"
          />
          <Button 
            onClick={onSubmit} 
            className="w-full bg-sky-600 text-white hover:bg-sky-700 flex items-center gap-1"
          >
            Hazır
            <CheckCircleIcon className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  )
} 