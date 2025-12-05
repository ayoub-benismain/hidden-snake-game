"use client"

import { useGameLogic } from "@/hooks/use-game-logic"
import { GameBoard } from "@/components/game-board"
import { ScoreDisplay } from "@/components/score-display"
import { GameOverModal } from "@/components/game-over-modal"
import { GameInstructions } from "@/components/game-instructions"

export default function TrollSnakePage() {
  const { snake, food, gameOver, score, face, blocker, isReversed, reverseTimer, screenShake, uiMsg, resetGame } =
    useGameLogic()

  const handlePauseClick = () => {
    // This triggers game over as a troll action
    alert("LOL NO PAUSE")
  }

  return (
    <div
      className={`min-h-screen bg-neutral-900 text-white font-mono flex flex-col items-center justify-center p-4 overflow-hidden ${
        isReversed ? "hue-rotate-90 blur-[1px]" : ""
      }`}
    >
      {/* CSS ANIMATIONS */}
      <style jsx global>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(3px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(3px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(1px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
        .shake-screen { animation: shake 0.5s; }
        .pop-in { animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes pop { from { transform: scale(0); } to { transform: scale(1); } }
      `}</style>

      {/* SCORE BOARD */}
      <ScoreDisplay score={score} isReversed={isReversed} reverseTimer={reverseTimer} />

      {/* GAME CONTAINER */}
      <GameBoard
        snake={snake}
        food={food}
        blocker={blocker}
        face={face}
        screenShake={screenShake}
        uiMsg={uiMsg}
        onPauseClick={handlePauseClick}
      />

      {/* GAME OVER OVERLAY */}
      {gameOver && <GameOverModal score={score} onRetry={resetGame} onQuit={() => window.location.reload()} />}

      {/* INSTRUCTIONS */}
      <GameInstructions />
    </div>
  )
}
