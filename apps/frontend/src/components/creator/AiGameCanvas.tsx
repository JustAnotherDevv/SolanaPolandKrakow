import { useEffect, useRef } from 'react'
import { useCreatorStore } from '@/stores/creatorStore'
import { runGameCode } from '@/lib/gameRunner'
import type { GameComponentProps } from '@/components/games/registry'

interface AiGameCanvasProps extends GameComponentProps {
  gameId: string
}

export function AiGameCanvas({ sdk, width, height, gameId }: AiGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<{ destroy(): void } | null>(null)

  const code = useCreatorStore((s) => s.games.find((g) => g.id === gameId)?.code ?? '')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !code) return

    if (instanceRef.current) {
      try { instanceRef.current.destroy() } catch {}
      instanceRef.current = null
    }

    canvas.width = width
    canvas.height = height

    // Bridge real GameSDK to gameRunner's interface
    const sdkBridge = {
      updateScore: (s: number) => sdk.updateScore(s),
      endGame: (s: number) => sdk.endGame(s),
      updateLives: (l: number) => sdk.updateLives(l),
      achievement: (id: string, name: string) => sdk.achievement(id, name),
    }

    const { instance } = runGameCode(canvas, sdkBridge, code)
    if (instance) instanceRef.current = instance

    return () => {
      if (instanceRef.current) {
        try { instanceRef.current.destroy() } catch {}
        instanceRef.current = null
      }
    }
  }, [code, width, height, sdk])

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
}
