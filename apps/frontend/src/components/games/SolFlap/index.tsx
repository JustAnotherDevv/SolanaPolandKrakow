import { useEffect, useRef } from 'react'
import { SolFlapGame } from './game'
import type { GameSDK } from '@/lib/sdk/GameSDK'

interface SolFlapProps {
  sdk: GameSDK
  width: number
  height: number
}

export function SolFlap({ sdk, width, height }: SolFlapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<SolFlapGame | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const game = new SolFlapGame(canvas, sdk)
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
