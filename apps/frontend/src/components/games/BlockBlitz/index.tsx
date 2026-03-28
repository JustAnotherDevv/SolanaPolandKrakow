import { useEffect, useRef } from 'react'
import { BlockBlitzGame } from './game'
import type { GameSDK } from '@/lib/sdk/GameSDK'

interface BlockBlitzProps {
  sdk: GameSDK
  width: number
  height: number
}

export function BlockBlitz({ sdk, width, height }: BlockBlitzProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<BlockBlitzGame | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const game = new BlockBlitzGame(canvas, sdk)
    gameRef.current = game
    game.start()
    return () => {
      game.destroy()
      gameRef.current = null
    }
  }, [sdk])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="block w-full h-full"
      style={{ touchAction: 'none' }}
    />
  )
}
