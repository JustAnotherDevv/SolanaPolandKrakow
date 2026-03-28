import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CodeVersion {
  id: string
  code: string
  createdAt: number
  label: string       // "v1", "v2", … or user-renamed
  messageId: string   // which stored message produced this version
}

export interface StoredMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  versionId?: string  // set if this message introduced a code version
  timestamp: number
  isError?: boolean
}

export interface GeneratedGame {
  id: string
  name: string
  description: string
  code: string                    // mirrors versions[currentVersionId].code
  versions: CodeVersion[]
  currentVersionId: string | null
  chatHistory: StoredMessage[]
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

  // Version management
  addVersion: (gameId: string, code: string, messageId: string) => string
  restoreVersion: (gameId: string, versionId: string) => void
  renameVersion: (gameId: string, versionId: string, label: string) => void

  // Chat history
  appendStoredMessage: (gameId: string, msg: StoredMessage) => void

  markPublished: (id: string) => void
  deleteGame: (id: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** Migrate legacy ChatMessage[] (no `id` field) to StoredMessage[] */
function migrateMessages(raw: unknown[]): StoredMessage[] {
  return raw.map((m: unknown) => {
    const msg = m as Record<string, unknown>
    if (typeof msg.id === 'string') return msg as unknown as StoredMessage
    return {
      id: generateId(),
      role: (msg.role as 'user' | 'assistant') ?? 'assistant',
      content: (msg.content as string) ?? '',
      timestamp: Date.now(),
    }
  })
}

/** Migrate a persisted game to the current schema */
function migrateGame(raw: Record<string, unknown>): GeneratedGame {
  const chatHistory = migrateMessages((raw.chatHistory as unknown[]) ?? [])
  const versions: CodeVersion[] = (raw.versions as CodeVersion[] | undefined) ?? []

  // If there's existing code but no versions, create a v1 from it
  if (versions.length === 0 && typeof raw.code === 'string' && raw.code) {
    versions.push({
      id: generateId(),
      code: raw.code as string,
      createdAt: (raw.createdAt as number) ?? Date.now(),
      label: 'v1',
      messageId: '',
    })
  }

  return {
    id: raw.id as string,
    name: (raw.name as string) ?? 'Untitled Game',
    description: (raw.description as string) ?? '',
    code: (raw.code as string) ?? '',
    versions,
    currentVersionId: (raw.currentVersionId as string | null) ?? (versions[0]?.id ?? null),
    chatHistory,
    createdAt: (raw.createdAt as number) ?? Date.now(),
    publishedToFeed: (raw.publishedToFeed as boolean) ?? false,
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCreatorStore = create<CreatorStore>()(
  persist(
    (set, _get) => ({
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
          versions: [],
          currentVersionId: null,
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

      addVersion: (gameId, code, messageId) => {
        const versionId = generateId()
        set((state) => ({
          games: state.games.map((g) => {
            if (g.id !== gameId) return g
            const vNum = g.versions.length + 1
            const newVersion: CodeVersion = {
              id: versionId,
              code,
              createdAt: Date.now(),
              label: `v${vNum}`,
              messageId,
            }
            return {
              ...g,
              code,
              versions: [...g.versions, newVersion],
              currentVersionId: versionId,
            }
          }),
        }))
        return versionId
      },

      restoreVersion: (gameId, versionId) =>
        set((state) => ({
          games: state.games.map((g) => {
            if (g.id !== gameId) return g
            const version = g.versions.find((v) => v.id === versionId)
            if (!version) return g
            return { ...g, code: version.code, currentVersionId: versionId }
          }),
        })),

      renameVersion: (gameId, versionId, label) =>
        set((state) => ({
          games: state.games.map((g) =>
            g.id !== gameId
              ? g
              : {
                  ...g,
                  versions: g.versions.map((v) =>
                    v.id === versionId ? { ...v, label } : v,
                  ),
                },
          ),
        })),

      appendStoredMessage: (gameId, msg) =>
        set((state) => ({
          games: state.games.map((g) =>
            g.id === gameId ? { ...g, chatHistory: [...g.chatHistory, msg] } : g,
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
              state.activeGameId === id ? (remaining[0]?.id ?? null) : state.activeGameId,
          }
        }),
    }),
    {
      name: 'creator-store-v2',
      partialize: (state) => ({ games: state.games, activeGameId: state.activeGameId }),
      // Migrate persisted data to current schema on rehydration
      merge: (persisted, current) => {
        const p = persisted as Partial<CreatorStore> & { games?: Record<string, unknown>[] }
        return {
          ...current,
          activeGameId: p.activeGameId ?? null,
          games: (p.games ?? []).map(migrateGame),
        }
      },
    },
  ),
)
