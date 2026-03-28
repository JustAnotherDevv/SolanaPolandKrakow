import { create } from 'zustand'
import type { GameStatus } from '@/lib/sdk/types'

interface GameStore {
  activeGameId: string | null
  score: number
  highScore: number
  status: GameStatus
  lives: number
  // Actions
  startGame: (gameId: string, initialLives?: number) => void
  updateScore: (score: number) => void
  updateLives: (lives: number) => void
  endGame: (finalScore: number) => void
  setStatus: (status: GameStatus) => void
  resetGame: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  activeGameId: null,
  score: 0,
  highScore: 0,
  status: 'idle',
  lives: 3,

  startGame: (gameId, initialLives = 3) =>
    set({ activeGameId: gameId, score: 0, lives: initialLives, status: 'playing' }),

  updateScore: (score) =>
    set((state) => ({
      score,
      highScore: Math.max(state.highScore, score),
    })),

  updateLives: (lives) => {
    set({ lives })
    if (lives <= 0) {
      const { score } = get()
      get().endGame(score)
    }
  },

  endGame: (finalScore) =>
    set((state) => ({
      status: 'gameover',
      score: finalScore,
      highScore: Math.max(state.highScore, finalScore),
    })),

  setStatus: (status) => set({ status }),

  resetGame: () =>
    set({ score: 0, lives: 3, status: 'idle', activeGameId: null }),
}))
