"use client"

import type { Snake, Food, Blocker } from "@/lib/game-types"
import { GRID_SIZE } from "@/lib/game-constants"

interface GameBoardProps {
  snake: Snake
  food: Food
  blocker: Blocker | null
  face: string
  screenShake: boolean
  uiMsg: string
  onPauseClick: () => void
}

export function GameBoard({ snake, food, blocker, face, screenShake, uiMsg, onPauseClick }: GameBoardProps) {
  return (
    <div
      className={`relative bg-neutral-800 border-4 border-neutral-600 rounded-lg shadow-2xl ${
        screenShake ? "shake-screen" : ""
      }`}
      style={{ width: GRID_SIZE * 20, height: GRID_SIZE * 20 }}
    >
      {/* GRID CELLS - SNAKE */}
      {snake.map((segment, i) => (
        <div
          key={`${segment.x}-${segment.y}`}
          className={`absolute w-5 h-5 flex items-center justify-center text-sm ${
            i === 0 ? "z-20 scale-125" : "z-10"
          } transition-all duration-100`}
          style={{
            left: segment.x * 20,
            top: segment.y * 20,
            backgroundColor: i === 0 ? "#FACC15" : "#4ADE80",
            borderRadius: i === 0 ? "4px" : "2px",
          }}
        >
          {i === 0 && <span className="transform -rotate-90">{face}</span>}
        </div>
      ))}

      {/* FOOD */}
      <div
        className={`absolute w-5 h-5 flex items-center justify-center text-lg transition-all duration-200 z-10 ${
          food.type === "moving" ? "animate-bounce" : ""
        } ${food.type === "reverse" ? "animate-spin" : ""}`}
        style={{ left: food.x * 20, top: food.y * 20 }}
      >
        {food.type === "normal" && "🍎"}
        {food.type === "moving" && "🏃"}
        {food.type === "reverse" && "🍄"}
      </div>

      {/* PATH BLOCKER */}
      {blocker && (
        <div
          className="absolute w-5 h-5 bg-red-600 z-30 flex items-center justify-center border-2 border-white pop-in"
          style={{ left: blocker.x * 20, top: blocker.y * 20 }}
        >
          🛑
          <div className="absolute -top-8 w-32 bg-white text-black text-xs font-bold p-1 rounded text-center shadow-lg">
            NOT SO FAST!
          </div>
        </div>
      )}

      {/* POPUP MESSAGES */}
      {uiMsg && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <h1 className="text-4xl font-black text-white stroke-black drop-shadow-lg animate-bounce transform -rotate-12 bg-black/50 p-2 rounded">
            {uiMsg}
          </h1>
        </div>
      )}

      {/* FAKE PAUSE BUTTON (UI TROLL) */}
      <button
        className="absolute top-2 right-2 bg-gray-700 text-xs p-1 rounded hover:bg-red-600 hover:scale-150 transition-all opacity-50 hover:opacity-100"
        onClick={onPauseClick}
      >
        ⏸️
      </button>
    </div>
  )
}
