// Game Configuration
export const GRID_SIZE = 20
export const SPEED = 100
export const REVERSE_DURATION = 10 // seconds

// Face Expressions
export const FACES = {
  normal: "😐",
  dead: "💀",
  troll: "🤪",
  scared: "😱",
  dizzy: "😵‍💫",
  cool: "😎",
} as const

// Food Types
export const FOOD_TYPES = ["normal", "moving", "reverse"] as const
