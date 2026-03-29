import { useState } from 'react'
import { motion } from 'motion/react'
import { Trophy, X, Loader2 } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { TxStatus, type TxState } from './TxStatus'
import type { LeaderboardEntry } from '@/lib/sdk/types'

interface LeaderboardOverlayProps {
  entries: LeaderboardEntry[]
  loading?: boolean
  playerScore?: number
  onSubmitScore?: (score: number) => Promise<string>
  onClose: () => void
}

export function LeaderboardOverlay({ entries, loading, playerScore, onSubmitScore, onClose }: LeaderboardOverlayProps) {
  const { publicKey, connected } = useWallet()
  const { setVisible } = useWalletModal()
  const [txState, setTxState] = useState<TxState>('idle')
  const [txSig, setTxSig] = useState<string>()
  const [error, setError] = useState<string>()
  const [submitted, setSubmitted] = useState(false)

  const playerAddress = publicKey?.toBase58()
  const shortAddr = (addr: string) => addr.slice(0, 4) + '...' + addr.slice(-4)

  async function handleSubmit() {
    if (!connected) {
      setVisible(true)
      return
    }
    if (!onSubmitScore || playerScore == null) return

    try {
      setTxState('signing')
      setError(undefined)
      const sig = await onSubmitScore(playerScore)
      setTxSig(sig)
      setTxState('success')
      setSubmitted(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('User rejected') ? 'Cancelled' : msg)
      setTxState('error')
    }
  }

  const medalColors = ['text-yellow-400', 'text-gray-300', 'text-orange-400']

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl p-5 max-w-sm w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-yellow-400" />
            <h3 className="text-sm font-medium text-white">Leaderboard</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X size={16} className="text-white/40" />
          </button>
        </div>

        {/* Score entries */}
        <div className="space-y-1 mb-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-primary/40" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center text-xs text-white/30 py-6">No scores yet. Be the first!</p>
          ) : (
            entries.map((entry, i) => {
              const isPlayer = playerAddress && entry.player === playerAddress
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                    isPlayer ? 'bg-primary/10 border border-primary/20' : 'bg-white/[0.03]'
                  }`}
                >
                  <span className={`text-sm font-bold w-6 text-center ${medalColors[i] || 'text-white/30'}`}>
                    {entry.rank}
                  </span>
                  <span className="flex-1 text-xs text-white/70 font-mono">
                    {isPlayer ? 'You' : shortAddr(entry.player)}
                  </span>
                  <span className="text-xs font-bold text-white">{entry.score.toLocaleString()}</span>
                </div>
              )
            })
          )}
        </div>

        {/* Submit score */}
        {playerScore != null && onSubmitScore && !submitted && (
          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40">Your score</span>
              <span className="text-sm font-bold text-primary">{playerScore.toLocaleString()}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={txState === 'signing' || txState === 'confirming'}
              className="w-full py-2.5 rounded-xl bg-primary text-black text-xs font-medium hover:bg-primary/80 transition-all disabled:opacity-50"
            >
              {!connected ? 'Connect Wallet' : 'Submit Score On-Chain'}
            </button>
            <TxStatus state={txState} txSig={txSig} error={error} />
          </div>
        )}
      </div>
    </motion.div>
  )
}
