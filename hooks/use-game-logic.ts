"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { GRID_SIZE, SPEED, REVERSE_DURATION, FACES } from "@/lib/game-constants"
import type { Position, Snake, Food, Direction, Blocker } from "@/lib/game-types"

export function useGameLogic() {
  const [snake, setSnake] = useState<Snake>([{ x: 10, y: 10 }])
  const [food, setFood] = useState<Food>({ x: 15, y: 10, type: "normal", dodgesLeft: 3 })
  const [direction, setDirection] = useState<Direction>({ x: 1, y: 0 })
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [face, setFace] = useState(FACES.normal)

  // Trap States
  const [blocker, setBlocker] = useState<Blocker | null>(null)
  const [isReversed, setIsReversed] = useState(false)
  const [reverseTimer, setReverseTimer] = useState(0)
  const [screenShake, setScreenShake] = useState(false)
  const [uiMsg, setUiMsg] = useState("")

  // Refs for mutable state inside interval
  const dirRef = useRef<Direction>({ x: 1, y: 0 })
  const snakeRef = useRef<Snake>([{ x: 10, y: 10 }])
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)
  const inputLocked = useRef(false)

  // --- HELPERS ---
  const getRandomPos = (): Position => ({
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  })

  const triggerShake = () => {
    setScreenShake(true)
    setTimeout(() => setScreenShake(false), 500)
  }

  const showMessage = (msg: string, duration = 1000) => {
    setUiMsg(msg)
    setTimeout(() => setUiMsg(""), duration)
  }

  // --- GAME LOGIC ---

  const spawnFood = useCallback(() => {
    let newPos = getRandomPos()
    while (snakeRef.current.some((s) => s.x === newPos.x && s.y === newPos.y)) {
      newPos = getRandomPos()
    }

    const rng = Math.random()
    let type: "normal" | "moving" | "reverse" = "normal"
    if (rng > 0.7) type = "moving"
    if (rng > 0.9) type = "reverse"

    setFood({ ...newPos, type, dodgesLeft: type === "moving" ? Math.floor(Math.random() * 3) + 1 : 0 })
  }, [])

  const resetGame = useCallback(() => {
    setSnake([{ x: 10, y: 10 }])
    snakeRef.current = [{ x: 10, y: 10 }]
    setDirection({ x: 1, y: 0 })
    dirRef.current = { x: 1, y: 0 }
    setGameOver(false)
    setScore(0)
    setFace(FACES.normal)
    setBlocker(null)
    setIsReversed(false)
    setReverseTimer(0)
    spawnFood()
  }, [spawnFood])

  // --- TRAP 1: MOVING BAIT LOGIC ---
  const handleMovingBait = (head: Position, currentFood: Food) => {
    const dist = Math.abs(head.x - currentFood.x) + Math.abs(head.y - currentFood.y)

    if (dist < 4 && currentFood.dodgesLeft > 0) {
      const rush = Math.random() < 0.1

      let newX = currentFood.x
      let newY = currentFood.y

      if (rush) {
        newX -= Math.sign(newX - head.x)
        newY -= Math.sign(newY - head.y)
        setFace(FACES.scared)
        showMessage("WAIT NO!", 500)
      } else {
        const dodgeDir = Math.random() > 0.5 ? "x" : "y"
        if (dodgeDir === "x") newX = currentFood.x + (head.x < currentFood.x ? 1 : -1)
        else newY = currentFood.y + (head.y < currentFood.y ? 1 : -1)
        setFace(FACES.troll)
        showMessage("TOO SLOW!", 500)
      }

      newX = Math.max(0, Math.min(GRID_SIZE - 1, newX))
      newY = Math.max(0, Math.min(GRID_SIZE - 1, newY))

      setFood((prev) => ({ ...prev, x: newX, y: newY, dodgesLeft: prev.dodgesLeft - 1 }))
      return true
    }
    return false
  }

  // --- TRAP 2: PATH BLOCKER LOGIC ---
  const checkPathBlocker = (head: Position, currentFood: Food) => {
    const dx = currentFood.x - head.x
    const dy = currentFood.y - head.y
    const isAligned = (dx === 0 && dirRef.current.y !== 0) || (dy === 0 && dirRef.current.x !== 0)
    const dist = Math.abs(dx) + Math.abs(dy)

    if (isAligned && dist > 2 && dist < 6 && !blocker && Math.random() > 0.6) {
      const blockX = head.x + dirRef.current.x * 2
      const blockY = head.y + dirRef.current.y * 2

      if (
        blockX >= 0 &&
        blockX < GRID_SIZE &&
        blockY >= 0 &&
        blockY < GRID_SIZE &&
        (blockX !== currentFood.x || blockY !== currentFood.y)
      ) {
        setBlocker({ x: blockX, y: blockY })
        triggerShake()
        return true
      }
    }
    return false
  }

  // --- MAIN LOOP ---
  useEffect(() => {
    if (gameOver) return

    gameLoopRef.current = setInterval(() => {
      const currentHead = snakeRef.current[0]

      if (food.type === "moving") {
        if (handleMovingBait(currentHead, food)) return
      }

      checkPathBlocker(currentHead, food)

      const newHead: Position = {
        x: currentHead.x + dirRef.current.x,
        y: currentHead.y + dirRef.current.y,
      }

      // --- COLLISIONS ---

      // Wall Collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameOver(true)
        setFace(FACES.dead)
        triggerShake()
        return
      }

      // Blocker Collision
      if (blocker && newHead.x === blocker.x && newHead.y === blocker.y) {
        setGameOver(true)
        setFace(FACES.dizzy)
        showMessage("BONK!", 1000)
        triggerShake()
        return
      }

      // Self Collision
      if (snakeRef.current.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        setGameOver(true)
        setFace(FACES.dead)
        triggerShake()
        return
      }

      // --- MOVEMENT ---
      const newSnake: Snake = [newHead, ...snakeRef.current]

      // Eat Food
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => s + 1)
        setFace(FACES.cool)

        if (food.type === "reverse") {
          setIsReversed(true)
          setReverseTimer(REVERSE_DURATION)
          showMessage("BRAIN DAMAGE!", 2000)
          triggerShake()
        }

        spawnFood()
      } else {
        newSnake.pop()
      }

      snakeRef.current = newSnake
      setSnake(newSnake)
      inputLocked.current = false

      // Blocker Cleanup
      if (blocker) {
        const distToBlocker = Math.abs(newHead.x - blocker.x) + Math.abs(newHead.y - blocker.y)
        if (distToBlocker > 4) setBlocker(null)
      }
    }, SPEED)

    return () => clearInterval(gameLoopRef.current!)
  }, [gameOver, food, blocker, spawnFood])

  // --- REVERSE TIMER ---
  useEffect(() => {
    if (reverseTimer > 0 && !gameOver) {
      const timer = setInterval(() => {
        setReverseTimer((prev) => {
          if (prev <= 1) {
            setIsReversed(false)
            showMessage("CONTROLS RESTORED")
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [reverseTimer, gameOver])

  // --- INPUT HANDLING ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || inputLocked.current) return

      const keyMap: Record<string, Direction> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
      }

      const move = keyMap[e.key]
      if (!move) return

      let finalMove = move
      if (isReversed) {
        finalMove = { x: -move.x, y: -move.y }
      }

      if (finalMove.x !== -dirRef.current.x && finalMove.y !== -dirRef.current.y) {
        dirRef.current = finalMove
        setDirection(finalMove)
        inputLocked.current = true
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [gameOver, isReversed])

  return {
    snake,
    food,
    direction,
    gameOver,
    score,
    face,
    blocker,
    isReversed,
    reverseTimer,
    screenShake,
    uiMsg,
    resetGame,
  }
}
