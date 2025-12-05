"use client"

interface GameOverModalProps {
  score: number
  onRetry: () => void
  onQuit: () => void
}

export function GameOverModal({ score, onRetry, onQuit }: GameOverModalProps) {
  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
      <h1 className="text-6xl font-black text-red-500 mb-4 animate-pulse">WASTED</h1>
      <p className="text-xl text-white mb-8">
        Score: {score} <span className="text-neutral-500">(Trash)</span>
      </p>

      <div className="flex gap-4">
        <button
          onClick={onRetry}
          className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-8 rounded-full shadow-[0_4px_0_rgb(20,83,45)] active:shadow-none active:translate-y-1 transition-all"
        >
          RETRY 🔄
        </button>
        <button
          className="bg-gray-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-full transition-all"
          onMouseEnter={(e) => (e.currentTarget.innerText = "DON'T 🚫")}
          onMouseLeave={(e) => (e.currentTarget.innerText = "GIVE UP 🏳️")}
          onClick={onQuit}
        >
          GIVE UP 🏳️
        </button>
      </div>
    </div>
  )
}
