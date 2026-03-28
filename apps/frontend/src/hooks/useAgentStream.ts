import { useState, useCallback, useRef, useEffect } from 'react'
import { useCreatorStore, generateId } from '@/stores/creatorStore'

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
  const appendStoredMessage = useCreatorStore((s) => s.appendStoredMessage)
  const games = useCreatorStore((s) => s.games)

  const eventSourceRef = useRef<EventSource | null>(null)
  const codeAccRef = useRef('')
  const assistantMsgIdRef = useRef('')

  // Ensure the backend game exists (create it with same ID as frontend)
  const ensureBackendGame = useCallback(async (name: string) => {
    const res = await fetch(`${BACKEND}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: gameId, name }),
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
        setSteps((prev) => [...prev, {
          id: generateId(),
          type: 'agent_step',
          message: data.message,
          icon: data.icon,
        }])
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
        setAssets((prev) => [...prev, data])
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

      es.addEventListener('coding', (e) => {
        const data = JSON.parse(e.data) as { message: string }
        setSteps((prev) => [...prev, {
          id: generateId(),
          type: 'coding',
          message: data.message,
          icon: '💻',
        }])
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

        if (code) {
          addVersion(gameId, code, assistantMsgId)
          if (data.name) updateName(gameId, data.name)
        }

        appendStoredMessage(gameId, {
          id: assistantMsgId,
          role: 'assistant',
          content: `Generated game with ${assets.length} sprite assets. Check the Code tab to preview!`,
          versionId: code ? undefined : undefined,
          timestamp: Date.now(),
        })

        setSteps((prev) => [...prev, { id: generateId(), type: 'done', message: 'Done!', icon: '🎉', done: true }])
        setStreaming(false)
        setStreamedCode('')
        codeAccRef.current = ''
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
        await ensureBackendGame(game?.name ?? 'Untitled Game')
        await openStream()

        const res = await fetch(`${BACKEND}/api/games/${gameId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage }),
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
