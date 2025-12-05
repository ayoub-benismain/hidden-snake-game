"use client"

interface ScoreDisplayProps {
  score: number
  isReversed: boolean
  reverseTimer: number
}

export function ScoreDisplay({ score, isReversed, reverseTimer }: ScoreDisplayProps) {
  return (
    <div className="mb-4 flex gap-8 text-2xl font-black uppercase tracking-widest text-yellow-400">
      <div>Score: {score}</div>
      {isReversed && <div className="text-red-500 animate-pulse">REVERSED: {reverseTimer}s</div>}
    </div>
  )
}
