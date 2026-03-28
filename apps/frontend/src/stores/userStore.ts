import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface GameHistoryEntry {
  gameId: string
  gameName: string
  score: number
  timestamp: number
  submitted: boolean
}

interface UserStore {
  gameHistory: GameHistoryEntry[]
  totalTipsSent: number
  recordPlay: (entry: GameHistoryEntry) => void
  markSubmitted: (gameId: string, timestamp: number) => void
  recordTip: (amountSol: number) => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      gameHistory: [],
      totalTipsSent: 0,

      recordPlay: (entry) =>
        set((state) => ({
          gameHistory: [entry, ...state.gameHistory].slice(0, 100), // keep last 100
        })),

      markSubmitted: (gameId, timestamp) =>
        set((state) => ({
          gameHistory: state.gameHistory.map((e) =>
            e.gameId === gameId && e.timestamp === timestamp
              ? { ...e, submitted: true }
              : e,
          ),
        })),

      recordTip: (amountSol) =>
        set((state) => ({ totalTipsSent: state.totalTipsSent + amountSol })),
    }),
    { name: 'gamefeed-user-store' },
  ),
)
