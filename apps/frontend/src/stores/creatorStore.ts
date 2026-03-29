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

export interface Vec3 { x: number; y: number; z: number }

export interface SceneObject {
  id: string
  name: string
  type: string
  position: Vec3
  rotation: Vec3
  scale: Vec3
  mesh?: { geometry: string; color: string }
  controller?: Record<string, unknown>
  abilities?: string[]
}

export interface Scene3D {
  settings: {
    skyColor: string
    ambientColor: string
    fog?: { color: string; near: number; far: number }
    gravity: number
  }
  objects: SceneObject[]
}

export interface GeneratedGame {
  id: string
  name: string
  description: string
  type: '2d' | '3d'
  code: string                    // mirrors versions[currentVersionId].code
  scene?: Scene3D                 // 3D games only
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
  startNewGame: (type?: '2d' | '3d') => string
  setActiveGame: (id: string | null) => void

  updateCode: (id: string, code: string) => void
  updateName: (id: string, name: string) => void
  updateScene: (id: string, scene: Scene3D) => void
  updateSceneObject: (gameId: string, objectId: string, patch: Partial<SceneObject>) => void
  addSceneObject: (gameId: string, obj: SceneObject) => void
  removeSceneObject: (gameId: string, objectId: string) => void
  duplicateSceneObject: (gameId: string, objectId: string) => string

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
    type: (raw.type as '2d' | '3d' | undefined) ?? '2d',
    code: (raw.code as string) ?? '',
    scene: raw.scene as Scene3D | undefined,
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

      startNewGame: (type = '2d') => {
        const id = generateId()
        const game: GeneratedGame = {
          id,
          name: 'Untitled Game',
          description: 'AI-generated game',
          type,
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

      updateScene: (id, scene) =>
        set((state) => ({
          games: state.games.map((g) => (g.id === id ? { ...g, scene } : g)),
        })),

      updateSceneObject: (gameId, objectId, patch) =>
        set((state) => ({
          games: state.games.map((g) => {
            if (g.id !== gameId || !g.scene) return g
            return {
              ...g,
              scene: {
                ...g.scene,
                objects: g.scene.objects.map((o) =>
                  o.id === objectId ? { ...o, ...patch } : o,
                ),
              },
            }
          }),
        })),

      addSceneObject: (gameId, obj) =>
        set((state) => ({
          games: state.games.map((g) => {
            if (g.id !== gameId) return g
            const scene = g.scene ?? {
              settings: { skyColor: '#1a0a2e', ambientColor: '#404060', gravity: -9.8 },
              objects: [],
            }
            return { ...g, scene: { ...scene, objects: [...scene.objects, obj] } }
          }),
        })),

      removeSceneObject: (gameId, objectId) =>
        set((state) => ({
          games: state.games.map((g) => {
            if (g.id !== gameId || !g.scene) return g
            return {
              ...g,
              scene: { ...g.scene, objects: g.scene.objects.filter((o) => o.id !== objectId) },
            }
          }),
        })),

      duplicateSceneObject: (gameId, objectId) => {
        const newId = generateId()
        set((state) => ({
          games: state.games.map((g) => {
            if (g.id !== gameId || !g.scene) return g
            const src = g.scene.objects.find((o) => o.id === objectId)
            if (!src) return g
            const copy: SceneObject = {
              ...src,
              id: newId,
              name: src.name + ' (copy)',
              position: { x: src.position.x + 1.5, y: src.position.y, z: src.position.z + 1.5 },
            }
            return { ...g, scene: { ...g.scene, objects: [...g.scene.objects, copy] } }
          }),
        }))
        return newId
      },

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
