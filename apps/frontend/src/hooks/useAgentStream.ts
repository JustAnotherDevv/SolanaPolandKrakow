import { useState, useCallback, useRef, useEffect } from 'react'
import { useCreatorStore, generateId } from '@/stores/creatorStore'
import type { Scene3D } from '@/stores/creatorStore'

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? ''

export interface AgentStepItem {
  id: string
  type: string
  message?: string
  icon?: string
  name?: string
  assetUrl?: string
  structureName?: string
  structureType?: string
  done?: boolean
}

export interface GeneratedAsset {
  assetId: string
  name: string
  url: string
  type: string
}

export function useAgentStream(gameId: string) {
  const [streaming, setStreaming] = useState(false)
  const [steps, setSteps] = useState<AgentStepItem[]>([])
  const [assets, setAssets] = useState<GeneratedAsset[]>([])
  const [streamedCode, setStreamedCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const addVersion = useCreatorStore((s) => s.addVersion)
  const updateName = useCreatorStore((s) => s.updateName)
  const updateScene = useCreatorStore((s) => s.updateScene)
  const appendStoredMessage = useCreatorStore((s) => s.appendStoredMessage)
  const games = useCreatorStore((s) => s.games)

  const eventSourceRef = useRef<EventSource | null>(null)
  const codeAccRef = useRef('')
  const assistantMsgIdRef = useRef('')
  const assetsAccRef = useRef<GeneratedAsset[]>([])
  const stepsAccRef = useRef<AgentStepItem[]>([])

  // Ensure the backend game exists (create it with same ID as frontend)
  const ensureBackendGame = useCallback(async (name: string, type?: '2d' | '3d') => {
    const res = await fetch(`${BACKEND}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: gameId, name, type: type ?? '2d' }),
    })
    if (!res.ok) {
      // Game may already exist — ignore 409 or duplicate key errors
      if (res.status !== 409 && res.status !== 500) {
        throw new Error(`Failed to create backend game: ${res.status}`)
      }
    }
  }, [gameId])

  const openStream = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      const es = new EventSource(`${BACKEND}/api/games/${gameId}/stream`)
      eventSourceRef.current = es

      es.addEventListener('agent_step', (e) => {
        const data = JSON.parse(e.data) as { message: string; icon: string; step: string }
        const step = { id: generateId(), type: 'agent_step', message: data.message, icon: data.icon }
        stepsAccRef.current = [...stepsAccRef.current, step]
        setSteps((prev) => [...prev, step])
      })

      es.addEventListener('search_done', (e) => {
        const data = JSON.parse(e.data) as { query: string; snippets: Array<{ title: string }> }
        setSteps((prev) => [...prev, {
          id: generateId(),
          type: 'search_done',
          message: `Found ${data.snippets.length} results for "${data.query}"`,
          icon: '✓',
        }])
      })

      es.addEventListener('generating', (e) => {
        const data = JSON.parse(e.data) as { name: string; type: string }
        setSteps((prev) => [...prev, {
          id: generateId(),
          type: 'generating',
          message: `Generating ${data.type}: ${data.name}`,
          icon: '🎨',
          name: data.name,
        }])
      })

      es.addEventListener('asset_ready', (e) => {
        const data = JSON.parse(e.data) as { assetId: string; name: string; url: string; type: string }
        assetsAccRef.current = [...assetsAccRef.current, data]
        setAssets(assetsAccRef.current)
        setSteps((prev) => [
          ...prev.slice(0, -1), // replace last "generating" step
          { id: generateId(), type: 'asset_ready', message: `Generated: ${data.name}`, icon: '✓', name: data.name, assetUrl: data.url },
        ])
      })

      es.addEventListener('structure', (e) => {
        const data = JSON.parse(e.data) as { type: string; name: string }
        setSteps((prev) => [...prev, {
          id: generateId(),
          type: 'structure',
          message: `Defined ${data.type}: ${data.name}`,
          icon: '📋',
          structureType: data.type,
          structureName: data.name,
        }])
      })

      es.addEventListener('scene_update', (e) => {
        const data = JSON.parse(e.data) as { scene: Scene3D }
        updateScene(gameId, data.scene)
        setSteps((prev) => {
          // Replace last scene_update step instead of stacking
          const last = prev[prev.length - 1]
          const newStep = {
            id: generateId(),
            type: 'scene_update',
            message: `Scene: ${data.scene.objects.length} object${data.scene.objects.length !== 1 ? 's' : ''}`,
            icon: '🧊',
          }
          if (last?.type === 'scene_update') return [...prev.slice(0, -1), newStep]
          return [...prev, newStep]
        })
      })

      es.addEventListener('coding', (e) => {
        const data = JSON.parse(e.data) as { message: string }
        setSteps((prev) => [...prev, {
          id: generateId(),
          type: 'coding',
          message: data.message,
          icon: '💻',
        }])
      })

      es.addEventListener('code_reset', () => {
        codeAccRef.current = ''
        setStreamedCode('')
      })

      es.addEventListener('code_chunk', (e) => {
        const data = JSON.parse(e.data) as { delta: string }
        codeAccRef.current += data.delta
        setStreamedCode(codeAccRef.current)
      })

      es.addEventListener('done', (e) => {
        const data = JSON.parse(e.data) as { name?: string }
        const code = codeAccRef.current
        const assistantMsgId = assistantMsgIdRef.current

        let versionId: string | undefined
        if (code) {
          versionId = addVersion(gameId, code, assistantMsgId)
          if (data.name) updateName(gameId, data.name)
        }

        // Build a summary from what the agent actually did
        const allSteps = stepsAccRef.current
        const assetCount = assetsAccRef.current.length
        const actionLines = allSteps
          .filter(s => s.message && s.type === 'agent_step' && !s.message.startsWith('Starting') && !s.message.startsWith('Fixing'))
          .map(s => `${s.icon ?? '·'} ${s.message}`)
        const summary = actionLines.length > 0
          ? actionLines.join('\n')
          : (code ? 'Game code updated.' : 'Done.')
        const assetNote = assetCount > 0 ? `\n\n${assetCount} asset${assetCount !== 1 ? 's' : ''} generated.` : ''

        appendStoredMessage(gameId, {
          id: assistantMsgId,
          role: 'assistant',
          content: summary + assetNote,
          versionId,
          timestamp: Date.now(),
        })

        setSteps((prev) => [...prev, { id: generateId(), type: 'done', message: 'Done!', icon: '🎉', done: true }])
        setStreaming(false)
        setStreamedCode('')
        codeAccRef.current = ''
        stepsAccRef.current = []
        es.close()
      })

      es.addEventListener('error', (e) => {
        if ('data' in e) {
          const data = JSON.parse((e as MessageEvent).data) as { message: string }
          setError(data.message)
        }
        setStreaming(false)
        es.close()
      })

      // Resolve once stream is open (first message or immediate)
      es.onopen = () => resolve()
      // Also resolve on error to not block forever
      es.onerror = () => resolve()
    })
  }, [gameId, assets, addVersion, updateName, appendStoredMessage])

  const send = useCallback(
    async (userMessage: string) => {
      if (!BACKEND || streaming) return

      setError(null)
      setStreaming(true)
      setSteps([])
      setAssets([])
      setStreamedCode('')
      codeAccRef.current = ''
      assetsAccRef.current = []
      stepsAccRef.current = []

      const userMsgId = generateId()
      const assistantMsgId = generateId()
      assistantMsgIdRef.current = assistantMsgId

      appendStoredMessage(gameId, {
        id: userMsgId,
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
      })

      try {
        const game = games.find((g) => g.id === gameId)
        await ensureBackendGame(game?.name ?? 'Untitled Game', game?.type)
        await openStream()

        // Send current code/scene so backend has context for modify mode
        const res = await fetch(`${BACKEND}/api/games/${gameId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            mode: game?.type ?? '2d',
            currentCode: game?.code ?? undefined,
            currentScene: game?.scene ?? undefined,
          }),
        })

        if (!res.ok) throw new Error(`Backend error: ${res.status}`)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        appendStoredMessage(gameId, {
          id: assistantMsgId,
          role: 'assistant',
          content: `Error: ${msg}`,
          timestamp: Date.now(),
          isError: true,
        })
        setStreaming(false)
        eventSourceRef.current?.close()
      }
    },
    [gameId, streaming, games, ensureBackendGame, openStream, appendStoredMessage],
  )

  const abort = useCallback(() => {
    eventSourceRef.current?.close()
    setStreaming(false)
    setStreamedCode('')
    codeAccRef.current = ''
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  return { send, abort, streaming, steps, assets, streamedCode, error, backendAvailable: !!BACKEND }
}
