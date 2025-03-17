import { Button } from "./ui/button"
import { PlayIcon, XMarkIcon } from "@heroicons/react/24/outline"

interface StartGameFormProps {
  adminName: string
  onAdminNameChange: (name: string) => void
  onCreateGame: () => void
  onCancel: () => void
}

export function StartGameForm({
  adminName,
  onAdminNameChange,
  onCreateGame,
  onCancel
}: StartGameFormProps) {
  return (
    <div className="bg-gray-800 rounded-lg shadow p-4 space-y-4 animate-fade-in">
      <input
        type="text"
        value={adminName}
        onChange={(e) => onAdminNameChange(e.target.value)}
        placeholder="İsminizi girin"
        className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:outline-none"
        autoFocus
      />
      <div className="flex space-x-2">
        <Button
          onClick={onCreateGame}
          className="flex-1 bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1"
        >
          Oyunu Başlat
          <PlayIcon className="w-4 h-4" />
        </Button>
        <Button
          onClick={onCancel}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white flex items-center gap-1"
        >
          İptal
          <XMarkIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
} 