import { create } from 'zustand'
import type { FeedGame } from '@/lib/mockData'
import { initialFeedGames, generateMoreGames } from '@/lib/mockData'

interface FeedStore {
  games: FeedGame[]
  currentIndex: number
  loading: boolean
  loadMore: () => void
  setCurrentIndex: (index: number) => void
}

export const useFeedStore = create<FeedStore>((set, get) => ({
  games: initialFeedGames,
  currentIndex: 0,
  loading: false,

  loadMore: () => {
    if (get().loading) return
    set({ loading: true })
    setTimeout(() => {
      const current = get().games
      const newGames = generateMoreGames(current.length, 4)
      set({ games: [...current, ...newGames], loading: false })
    }, 700)
  },

  setCurrentIndex: (index) => set({ currentIndex: index }),
}))
