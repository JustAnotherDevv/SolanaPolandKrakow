import { useEffect, useRef, useState, type ComponentType } from 'react'
import { loadGame, type GameComponentProps } from '@/components/games/registry'
import type { GameSDK } from '@/lib/sdk/GameSDK'

interface GameCanvasProps {
  slug: string
  sdk: GameSDK
}

export function GameCanvas({ slug, sdk }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 390, h: 600 })
  const [GameComponent, setGameComponent] = useState<ComponentType<GameComponentProps> | null>(null)

  // Measure container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setSize({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Load game module
  useEffect(() => {
    loadGame(slug).then((C) => setGameComponent(() => C))
  }, [slug])

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-black">
      {GameComponent && (
        <GameComponent sdk={sdk} width={size.w} height={size.h} />
      )}
    </div>
  )
}
