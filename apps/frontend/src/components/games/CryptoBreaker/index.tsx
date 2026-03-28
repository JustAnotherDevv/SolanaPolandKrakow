import { useEffect, useRef } from 'react'
import { CryptoBreakerGame } from './game'
import type { GameSDK } from '@/lib/sdk/GameSDK'

interface CryptoBreakerProps {
  sdk: GameSDK
  width: number
  height: number
}

export function CryptoBreaker({ sdk, width, height }: CryptoBreakerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<CryptoBreakerGame | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const game = new CryptoBreakerGame(canvas, sdk)
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
