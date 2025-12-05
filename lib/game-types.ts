export interface Position {
  x: number
  y: number
}

export interface Snake extends Array<Position> {}

export interface Food extends Position {
  type: "normal" | "moving" | "reverse"
  dodgesLeft: number
}

export interface Blocker extends Position {}

export interface Direction {
  x: number
  y: number
}

export type FaceType = keyof typeof import("./game-constants").FACES
