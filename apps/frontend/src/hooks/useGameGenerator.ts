import { useState, useCallback } from 'react'
import { streamGameGeneration } from '@/lib/openrouter'
import { extractCode } from '@/lib/gameRunner'
import { useCreatorStore } from '@/stores/creatorStore'

export function useGameGenerator(gameId: string) {
  const [streaming, setStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const appendMessage = useCreatorStore((s) => s.appendMessage)
  const updateCode = useCreatorStore((s) => s.updateCode)
  const updateName = useCreatorStore((s) => s.updateName)
  const games = useCreatorStore((s) => s.games)

  const send = useCallback(
    async (userMessage: string) => {
      if (streaming) return
      setError(null)
      setStreamedText('')
      setStreaming(true)

      appendMessage(gameId, { role: 'user', content: userMessage })

      const game = games.find((g) => g.id === gameId)
      const history = game?.chatHistory ?? []

      let fullResponse = ''
      try {
        for await (const delta of streamGameGeneration([
          ...history,
          { role: 'user', content: userMessage },
        ])) {
          fullResponse += delta
          setStreamedText(fullResponse)
        }

        const code = extractCode(fullResponse)
        if (code) {
          updateCode(gameId, code)
          // Auto-extract game name from first user message if still default
          if (game?.name === 'Untitled Game' && history.length === 0) {
            const nameLine = fullResponse.match(/(?:^|\n)#+\s*([^\n]{3,40})/)?.[1]
            const inferredName =
              nameLine ??
              userMessage
                .replace(/[^a-zA-Z0-9 ]/g, '')
                .split(' ')
                .slice(0, 3)
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join('')
            if (inferredName) updateName(gameId, inferredName)
          }
        }
        appendMessage(gameId, { role: 'assistant', content: fullResponse })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        appendMessage(gameId, {
          role: 'assistant',
          content: `Error: ${msg}`,
        })
      } finally {
        setStreaming(false)
        setStreamedText('')
      }
    },
    [gameId, streaming, games, appendMessage, updateCode, updateName],
  )

  return { send, streaming, streamedText, error }
}
