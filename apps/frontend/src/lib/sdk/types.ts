export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover' | 'submitting' | 'submitted'

export interface GameSDKCallbacks {
  onScoreUpdate: (score: number) => void
  onGameEnd: (finalScore: number) => void
  onAchievement: (id: string, name: string) => void
  onLivesUpdate: (lives: number) => void
}

export interface GameInstance {
  start: () => void
  pause: () => void
  resume: () => void
  destroy: () => void
}
