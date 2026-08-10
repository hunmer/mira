export interface Track {
  title: string
  artist: string
  cover: string
  src: string
}

export type LoopMode = 'off' | 'all' | 'one'
export type Direction = 'next' | 'prev' | null

export interface Layer {
  id: number
  track: Track
  dir: Direction
}
