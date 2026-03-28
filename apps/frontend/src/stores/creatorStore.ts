import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage } from '@/lib/openrouter'

export interface GeneratedGame {
  id: string
  name: string
  description: string
  code: string
  chatHistory: ChatMessage[]
  createdAt: number
  publishedToFeed: boolean
}

interface CreatorStore {
  games: GeneratedGame[]
  activeGameId: string | null
  gameType: '2d' | '3d'
  setGameType: (t: '2d' | '3d') => void
  startNewGame: () => string
  setActiveGame: (id: string | null) => void
  updateCode: (id: string, code: string) => void
  updateName: (id: string, name: string) => void
  appendMessage: (id: string, msg: ChatMessage) => void
  markPublished: (id: string) => void
  deleteGame: (id: string) => void
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export const useCreatorStore = create<CreatorStore>()(
  persist(
    (set, get) => ({
      games: [],
      activeGameId: null,
      gameType: '2d',

      setGameType: (t) => set({ gameType: t }),

      startNewGame: () => {
        const id = generateId()
        const game: GeneratedGame = {
          id,
          name: 'Untitled Game',
          description: 'AI-generated game',
          code: '',
          chatHistory: [],
          createdAt: Date.now(),
          publishedToFeed: false,
        }
        set((state) => ({ games: [game, ...state.games], activeGameId: id }))
        return id
      },

      setActiveGame: (id) => set({ activeGameId: id }),

      updateCode: (id, code) =>
        set((state) => ({
          games: state.games.map((g) => (g.id === id ? { ...g, code } : g)),
        })),

      updateName: (id, name) =>
        set((state) => ({
          games: state.games.map((g) => (g.id === id ? { ...g, name } : g)),
        })),

      appendMessage: (id, msg) =>
        set((state) => ({
          games: state.games.map((g) =>
            g.id === id ? { ...g, chatHistory: [...g.chatHistory, msg] } : g,
          ),
        })),

      markPublished: (id) =>
        set((state) => ({
          games: state.games.map((g) =>
            g.id === id ? { ...g, publishedToFeed: true } : g,
          ),
        })),

      deleteGame: (id) =>
        set((state) => {
          const remaining = state.games.filter((g) => g.id !== id)
          return {
            games: remaining,
            activeGameId:
              state.activeGameId === id
                ? (remaining[0]?.id ?? null)
                : state.activeGameId,
          }
        }),

      // Derived helper: get active game
      get activeGame() {
        const { games, activeGameId } = get()
        return games.find((g) => g.id === activeGameId) ?? null
      },
    }),
    {
      name: 'creator-store',
      partialize: (state) => ({ games: state.games, activeGameId: state.activeGameId }),
    },
  ),
)
