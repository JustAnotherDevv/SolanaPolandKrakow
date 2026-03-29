import { useEffect, useRef, useState } from 'react'
import { useCreatorStore } from '@/stores/creatorStore'
import { runGameCode } from '@/lib/gameRunner'
import type { GameComponentProps } from '@/components/games/registry'
import { SolanaOverlay, type SolanaOverlayState } from '@/components/solana/SolanaOverlay'
import type { ShopItem, ShopPurchase, NFTMetadata } from '@/lib/sdk/types'

interface AiGameCanvasProps extends GameComponentProps {
  gameId: string
}

export function AiGameCanvas({ sdk, width, height, gameId }: AiGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<{ destroy(): void } | null>(null)
  const [overlayState, setOverlayState] = useState<SolanaOverlayState>(null)

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

    // Bridge real GameSDK to gameRunner's interface, including Solana methods
    const sdkBridge = {
      updateScore: (s: number) => sdk.updateScore(s),
      endGame: (s: number) => sdk.endGame(s),
      updateLives: (l: number) => sdk.updateLives(l),
      achievement: (id: string, name: string) => sdk.achievement(id, name),
      requestPayment: (amountSol: number, recipient?: string) =>
        new Promise<string>((resolve, reject) =>
          setOverlayState({ type: 'payment', amountSol, recipient, resolve, reject })),
      showShop: (items: ShopItem[]) =>
        new Promise<ShopPurchase[]>((resolve, reject) =>
          setOverlayState({ type: 'shop', items, resolve, reject })),
      mintNFT: (metadata: NFTMetadata) =>
        new Promise<string>((resolve, reject) =>
          setOverlayState({ type: 'mint', metadata, resolve, reject })),
      getLeaderboard: () => Promise.resolve([]),
      submitScore: () => Promise.resolve(''),
      showLeaderboard: () =>
        setOverlayState({ type: 'leaderboard', entries: [], loading: false }),
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

  return (
    <div className="relative" style={{ width, height }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
      <SolanaOverlay state={overlayState} onDismiss={() => setOverlayState(null)} />
    </div>
  )
}
