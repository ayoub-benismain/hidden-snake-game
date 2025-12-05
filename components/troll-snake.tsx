"use client"

import { useState, useEffect, useRef } from "react"

// --- CONFIGURATION ---
const GRID_SIZE = 20
const SPEED = 100
const REVERSE_DURATION = 10 // seconds

// Blocker timings (configurable)
const BLOCKER_ACTIVATE_MS = 300 // délai avant activation (alerte visible)
const BLOCKER_LIFETIME_MS = 4000 // durée avant suppression si rien ne se passe

// --- ASSETS & STYLES ---
const FACES = {
  normal: "😐",
  dead: "💀",
  troll: "🤪",
  scared: "😱",
  dizzy: "😵‍💫",
  cool: "😎",
}

export default function TrollSnake() {
  // --- STATE ---
  const [snake, setSnake] = useState([{ x: 10, y: 10 }])
  const [food, setFood] = useState({ x: 15, y: 10, type: "normal", dodgesLeft: 3 })
  const [direction, setDirection] = useState({ x: 1, y: 0 })
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [face, setFace] = useState(FACES.normal)

  // Blocker state:
  // null OR { x, y, active: bool, dx, dy, spawnedAt }
  // When spawned, it appears on the food (inactive). After activation, it has dx/dy and moves each tick.
  const [blocker, setBlocker] = useState(null)

  const [isReversed, setIsReversed] = useState(false)
  const [reverseTimer, setReverseTimer] = useState(0)
  const [screenShake, setScreenShake] = useState(false)
  const [uiMsg, setUiMsg] = useState("")

  // Refs
  const dirRef = useRef({ x: 1, y: 0 })
  const snakeRef = useRef([{ x: 10, y: 10 }])
  const gameLoopRef = useRef(null)
  const inputLocked = useRef(false)

  // Timeouts refs to allow cleanup
  const activationTimeoutRef = useRef(null)
  const lifetimeTimeoutRef = useRef(null)

  // --- HELPERS ---
  const getRandomPos = () => ({
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  })

  const triggerShake = () => {
    setScreenShake(true)
    setTimeout(() => setScreenShake(false), 500)
  }

  const showMessage = (msg, duration = 1000) => {
    setUiMsg(msg)
    setTimeout(() => setUiMsg(""), duration)
  }

  // --- FOOD ---
  const spawnFood = () => {
    let newPos = getRandomPos()

    while (snakeRef.current.some((s) => s.x === newPos.x && s.y === newPos.y)) {
      newPos = getRandomPos()
    }

    const rng = Math.random()
    let type = "normal"
    if (rng > 0.4) type = "moving"
    if (rng > 0.75) type = "reverse"

    setFood({ ...newPos, type, dodgesLeft: type === "moving" ? Math.floor(Math.random() * 3) + 1 : 0 })
  }

  const clearBlockerTimeouts = () => {
    if (activationTimeoutRef.current) {
      clearTimeout(activationTimeoutRef.current)
      activationTimeoutRef.current = null
    }
    if (lifetimeTimeoutRef.current) {
      clearTimeout(lifetimeTimeoutRef.current)
      lifetimeTimeoutRef.current = null
    }
  }

  const resetGame = () => {
    clearBlockerTimeouts()
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
  }

  // --- TRAP 1: MOVING BAIT ---
  const handleMovingBait = (head, currentFood) => {
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

  // --- TRAP 2: spawn blocker ON the food, then move from food -> snake ---
  const checkPathBlocker = (head) => {
    // do nothing if there's already a blocker pending/active
    if (blocker) return false

    const dx = food.x - head.x
    const dy = food.y - head.y
    // alignment: same row or same column (snake heading along axis)
    const isAligned = (dx === 0 && dirRef.current.y !== 0) || (dy === 0 && dirRef.current.x !== 0)
    const dist = Math.abs(dx) + Math.abs(dy)

    // spawn earlier: when snake is within a larger window but not too close
    if (isAligned && dist >= 3 && dist <= 9 && Math.random() > 0.55) {
      // spawn exactly where the food is (apple) and mark inactive
      const spawnX = food.x
      const spawnY = food.y

      // ensure spawn cell is valid (it is, since food is on grid)
      setBlocker({ x: spawnX, y: spawnY, active: false, dx: 0, dy: 0, spawnedAt: Date.now() })
      triggerShake()
      showMessage("⚠️ TRAP SPAWNED ON APPLE", 700)

      // clear existing timeouts (safety)
      clearBlockerTimeouts()

      // Activation: compute direction from apple -> snake head at activation time
      activationTimeoutRef.current = setTimeout(() => {
        // capture current head position to aim at (so blocker heads toward snake)
        const headNow = snakeRef.current[0]
        const dirX = Math.sign(headNow.x - spawnX)
        const dirY = Math.sign(headNow.y - spawnY)

        // If both zero (snake on apple) set a fallback to block one step ahead of head
        let dxStep = dirX
        let dyStep = dirY
        if (dxStep === 0 && dyStep === 0) {
          // snake is on apple — make blocker move in current snake direction (reverse)
          dxStep = dirRef.current.x
          dyStep = dirRef.current.y
        }

        // set blocker active and give it a movement vector (dxStep, dyStep)
        setBlocker((prev) => (prev ? { ...prev, active: true, dx: dxStep, dy: dyStep } : null))
        activationTimeoutRef.current = null

        // schedule automatic removal after lifetime (if it doesn't collide)
        lifetimeTimeoutRef.current = setTimeout(() => {
          setBlocker(null)
          lifetimeTimeoutRef.current = null
        }, BLOCKER_LIFETIME_MS)
      }, BLOCKER_ACTIVATE_MS)

      return true
    }

    return false
  }

  // --- MAIN LOOP ---
  useEffect(() => {
    if (gameOver) return

    gameLoopRef.current = setInterval(() => {
      const currentHead = snakeRef.current[0]

      // 1) moving bait
      if (food.type === "moving") {
        if (handleMovingBait(currentHead, food)) return // food moved this tick -> skip move to simulate hesitation
      }

      // 2) maybe spawn blocker on the apple (inactive alert)
      checkPathBlocker(currentHead)

      // 2.5) If blocker is active, move it first (so it can hit the snake before snake steps into its cell)
      if (blocker?.active) {
        // compute next blocker position
        const nextBx = blocker.x + (blocker.dx || 0)
        const nextBy = blocker.y + (blocker.dy || 0)

        // check bounds
        if (nextBx < 0 || nextBx >= GRID_SIZE || nextBy < 0 || nextBy >= GRID_SIZE) {
          // out of bounds -> remove blocker
          clearBlockerTimeouts()
          setBlocker(null)
        } else {
          // move blocker
          setBlocker((prev) => (prev ? { ...prev, x: nextBx, y: nextBy } : null))

          // If blocker reaches snake head -> instant death
          if (nextBx === currentHead.x && nextBy === currentHead.y) {
            setGameOver(true)
            setFace(FACES.dizzy)
            showMessage("CRUSHED BY BLOCKER!", 1200)
            triggerShake()
            return
          }

          // Also if blocker hits any snake segment -> game over
          if (snakeRef.current.some((s) => s.x === nextBx && s.y === nextBy)) {
            setGameOver(true)
            setFace(FACES.dizzy)
            showMessage("BLOCKER SMASH!", 1200)
            triggerShake()
            return
          }

          // if blocker moves onto the food position, remove the food (blocker destroys the apple)
          if (nextBx === food.x && nextBy === food.y) {
            // remove food and spawn new one
            spawnFood()
          }
        }
      }

      // 3) compute snake's new head
      const newHead = {
        x: currentHead.x + dirRef.current.x,
        y: currentHead.y + dirRef.current.y,
      }

      // --- COLLISIONS ---
      // walls
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameOver(true)
        setFace(FACES.dead)
        triggerShake()
        return
      }

      // blocker collision: only if blocker exists AND (active OR snake tries to move into blocker while it's inactive)
      // we allow a small grace: if blocker is inactive and snake steps onto it, treat as harmless (player ate apple before trap activated).
      if (blocker) {
        if (blocker.active && newHead.x === blocker.x && newHead.y === blocker.y) {
          // snake runs into an active moving blocker
          setGameOver(true)
          setFace(FACES.dizzy)
          showMessage("BONK! BLOCKER", 1000)
          triggerShake()
          return
        }
      }

      // self collision
      if (snakeRef.current.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        setGameOver(true)
        setFace(FACES.dead)
        triggerShake()
        return
      }

      // move snake
      const newSnake = [newHead, ...snakeRef.current]

      // Eat food
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

      // update state
      snakeRef.current = newSnake
      setSnake(newSnake)
      inputLocked.current = false

      // If the snake has moved far away from an inactive blocker, cancel it (player avoided)
      if (blocker && !blocker.active) {
        const distToBlocker = Math.abs(newHead.x - blocker.x) + Math.abs(newHead.y - blocker.y)
        if (distToBlocker > 8) {
          clearBlockerTimeouts()
          setBlocker(null)
        }
      }
    }, SPEED)

    return () => {
      clearInterval(gameLoopRef.current)
      gameLoopRef.current = null
    }
  }, [gameOver, food, blocker])

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

  // --- INPUTS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameOver || inputLocked.current) return

      const keyMap = {
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

      // Prevent 180 turns
      if (finalMove.x !== -dirRef.current.x || finalMove.y !== -dirRef.current.y) {
        dirRef.current = finalMove
        setDirection(finalMove)
        inputLocked.current = true
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [gameOver, isReversed])

  // Cleanup timeouts on unmount/reset
  useEffect(() => {
    return () => {
      clearBlockerTimeouts()
    }
  }, [])

  // --- RENDER ---
  return (
    <div
      className={`min-h-screen bg-neutral-900 text-white font-mono flex flex-col items-center justify-center p-4 overflow-hidden ${isReversed ? "hue-rotate-90 blur-[1px]" : ""}`}
    >
      <style jsx global>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          100% { transform: translate(-1px, -2px) rotate(-1deg); }
        }
        .shake-screen { animation: shake 0.5s; }
        .pop-in { animation: pop 0.2s ease-out; }
        @keyframes pop { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>

      <div className="mb-4 flex gap-8 text-2xl font-black uppercase tracking-widest text-yellow-400">
        <div>Score: {score}</div>
        {isReversed && <div className="text-red-500 animate-pulse">REVERSED: {reverseTimer}s</div>}
      </div>

      <div
        className={`relative bg-neutral-800 border-4 border-neutral-600 rounded-lg shadow-2xl ${screenShake ? "shake-screen" : ""}`}
        style={{ width: GRID_SIZE * 20, height: GRID_SIZE * 20 }}
      >
        {/* snake */}
        {snake.map((segment, i) => (
          <div
            key={`${segment.x}-${segment.y}-${i}`}
            className={`absolute w-5 h-5 flex items-center justify-center text-sm ${i === 0 ? "z-20 scale-125" : "z-10"} transition-all duration-100`}
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

        {/* food */}
        <div
          className={`absolute w-5 h-5 flex items-center justify-center text-lg transition-all duration-200 z-10 ${food.type === "moving" ? "animate-bounce" : ""} ${food.type === "reverse" ? "animate-spin" : ""}`}
          style={{ left: food.x * 20, top: food.y * 20 }}
        >
          {food.type === "normal" && "🍎"}
          {food.type === "moving" && "🏃"}
          {food.type === "reverse" && "🍄"}
        </div>

        {/* blocker (appears on apple/in motion) */}
        {blocker && (
          <div
            className={`absolute w-5 h-5 flex items-center justify-center text-sm pop-in z-30`}
            style={{
              left: blocker.x * 20,
              top: blocker.y * 20,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.6)",
                backgroundColor: blocker.active ? "rgb(220,38,38)" : "rgb(234,179,8)",
                opacity: blocker.active ? 1 : 0.95,
              }}
            >
              {blocker.active ? "🛑" : "⚠️"}
            </div>
          </div>
        )}

        {/* UI message */}
        {uiMsg && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <h1 className="text-4xl font-black text-white stroke-black drop-shadow-lg transform -rotate-12 bg-black/50 p-2 rounded">
              {uiMsg}
            </h1>
          </div>
        )}
      </div>

      {gameOver && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
          <h1 className="text-6xl font-black text-red-500 mb-4 animate-pulse">WASTED</h1>
          <p className="text-xl text-white mb-8">Score: {score}</p>
          <div className="flex gap-4">
            <button
              onClick={resetGame}
              className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-8 rounded-full"
            >
              RETRY 🔄
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
