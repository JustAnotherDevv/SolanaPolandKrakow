import { useState, useCallback, useRef } from 'react'
import { streamGameGeneration } from '@/lib/openrouter'
import type { ChatMessage } from '@/lib/openrouter'
import { extractCode } from '@/lib/gameRunner'
import { useCreatorStore, generateId } from '@/stores/creatorStore'

export function useGameGenerator(gameId: string) {
  const [streaming, setStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const addVersion = useCreatorStore((s) => s.addVersion)
  const updateName = useCreatorStore((s) => s.updateName)
  const appendStoredMessage = useCreatorStore((s) => s.appendStoredMessage)
  const games = useCreatorStore((s) => s.games)

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const send = useCallback(
    async (userMessage: string) => {
      if (streaming) return
      setError(null)
      setStreamedText('')
      setStreaming(true)

      const userMsgId = generateId()
      appendStoredMessage(gameId, {
        id: userMsgId,
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
      })

      const game = games.find((g) => g.id === gameId)
      // Build API-compatible history from stored messages
      const apiHistory: ChatMessage[] = (game?.chatHistory ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const controller = new AbortController()
      abortRef.current = controller

      const assistantMsgId = generateId()
      let fullResponse = ''

      try {
        for await (const delta of streamGameGeneration(
          [...apiHistory, { role: 'user', content: userMessage }],
          controller.signal,
        )) {
          fullResponse += delta
          setStreamedText(fullResponse)
        }

        const code = extractCode(fullResponse)
        let versionId: string | undefined

        if (code) {
          versionId = addVersion(gameId, code, assistantMsgId)

          // Auto-extract game name from first user message if still default
          if (game?.name === 'Untitled Game' && (game?.chatHistory ?? []).length === 0) {
            const nameLine = fullResponse.match(/(?:^|\n)#+\s*([^\n]{3,40})/)?.[1]
            const inferredName =
              nameLine ??
              userMessage
                .replace(/[^a-zA-Z0-9 ]/g, '')
                .split(' ')
                .filter(Boolean)
                .slice(0, 3)
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join('')
            if (inferredName) updateName(gameId, inferredName)
          }
        }

        appendStoredMessage(gameId, {
          id: assistantMsgId,
          role: 'assistant',
          content: fullResponse,
          versionId,
          timestamp: Date.now(),
        })
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          // User cancelled — don't save partial response
        } else {
          const msg = e instanceof Error ? e.message : String(e)
          setError(msg)
          appendStoredMessage(gameId, {
            id: assistantMsgId,
            role: 'assistant',
            content: `Error: ${msg}`,
            timestamp: Date.now(),
            isError: true,
          })
        }
      } finally {
        abortRef.current = null
        setStreaming(false)
        setStreamedText('')
      }
    },
    [gameId, streaming, games, addVersion, updateName, appendStoredMessage],
  )

  return { send, abort, streaming, streamedText, error }
}
