import { useEffect, useRef } from 'react'
import { HashRunnerGame } from './game'
import type { GameSDK } from '@/lib/sdk/GameSDK'

interface HashRunnerProps {
  sdk: GameSDK
  width: number
  height: number
}

export function HashRunner({ sdk, width, height }: HashRunnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<HashRunnerGame | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const game = new HashRunnerGame(canvas, sdk)
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
