import { AnimatePresence } from 'motion/react'
import { PaymentGate } from './PaymentGate'
import { ShopModal } from './ShopModal'
import { MintModal } from './MintModal'
import { LeaderboardOverlay } from './LeaderboardOverlay'
import type { ShopItem, ShopPurchase, NFTMetadata, LeaderboardEntry } from '@/lib/sdk/types'

// ─── Overlay State Types ─────────────────────────────────────────────────────

export type SolanaOverlayState =
  | { type: 'payment'; amountSol: number; recipient?: string; resolve: (txSig: string) => void; reject: (reason: string) => void }
  | { type: 'shop'; items: ShopItem[]; resolve: (purchases: ShopPurchase[]) => void; reject: (reason: string) => void }
  | { type: 'mint'; metadata: NFTMetadata; resolve: (mintAddr: string) => void; reject: (reason: string) => void }
  | { type: 'leaderboard'; entries: LeaderboardEntry[]; loading?: boolean; playerScore?: number; onSubmitScore?: (score: number) => Promise<string>; resolve?: () => void }
  | null

interface SolanaOverlayProps {
  state: SolanaOverlayState
  onDismiss: () => void
}

export function SolanaOverlay({ state, onDismiss }: SolanaOverlayProps) {
  return (
    <AnimatePresence>
      {state?.type === 'payment' && (
        <PaymentGate
          key="payment"
          amountSol={state.amountSol}
          recipient={state.recipient}
          onSuccess={(sig) => { state.resolve(sig); onDismiss() }}
          onCancel={() => { state.reject('cancelled'); onDismiss() }}
        />
      )}

      {state?.type === 'shop' && (
        <ShopModal
          key="shop"
          items={state.items}
          onPurchase={(purchases) => { state.resolve(purchases); onDismiss() }}
          onClose={() => { state.resolve([]); onDismiss() }}
        />
      )}

      {state?.type === 'mint' && (
        <MintModal
          key="mint"
          metadata={state.metadata}
          onSuccess={(addr) => { state.resolve(addr); onDismiss() }}
          onCancel={() => { state.reject('cancelled'); onDismiss() }}
        />
      )}

      {state?.type === 'leaderboard' && (
        <LeaderboardOverlay
          key="leaderboard"
          entries={state.entries}
          loading={state.loading}
          playerScore={state.playerScore}
          onSubmitScore={state.onSubmitScore}
          onClose={() => { state.resolve?.(); onDismiss() }}
        />
      )}
    </AnimatePresence>
  )
}
