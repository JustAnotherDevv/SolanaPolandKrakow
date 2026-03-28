import { motion } from 'motion/react'
import { Trophy, X, ExternalLink } from 'lucide-react'
import { useGameStore } from '@/stores/gameStore'
import { useScoreSubmit } from '@/hooks/useScoreSubmit'
import { TipButton } from '@/components/social/TipButton'
import type { FeedGame } from '@/lib/mockData'

interface GameOverScreenProps {
  game: FeedGame
  onClose: () => void
  onLeaderboard: () => void
}

const TIER_LABEL = (score: number, game: FeedGame) => {
  if (score >= game.goldScore) return { label: 'GOLD', color: '#FFD700' }
  if (score >= game.silverScore) return { label: 'SILVER', color: '#C0C0C0' }
  if (score >= game.bronzeScore) return { label: 'BRONZE', color: '#CD7F32' }
  return null
}

export function GameOverScreen({ game, onClose, onLeaderboard }: GameOverScreenProps) {
  const { score, highScore, resetGame } = useGameStore()
  const { submit, status, error } = useScoreSubmit(game)
  const tier = TIER_LABEL(score, game)

  const isSubmitting = status === 'committing' || status === 'revealing' || status === 'claiming'
  const isDone = status === 'done'

  const statusLabel = {
    idle: 'Submit Score',
    committing: 'Committing…',
    revealing: 'Revealing…',
    claiming: 'Claiming Reward…',
    done: 'Submitted!',
    error: 'Retry',
  }[status]

  function handleClose() {
    resetGame()
    onClose()
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="absolute inset-x-0 bottom-0 z-20 rounded-t-2xl bg-black/95 border-t border-white/10 backdrop-blur-xl"
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-8 h-0.5 rounded-full bg-white/20" />
      </div>

      <div className="px-6 pb-8 pt-2">
        {/* Close */}
        <div className="flex justify-end mb-4">
          <button onClick={handleClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Score display */}
        <div className="text-center mb-6">
          <div className="text-5xl font-light tabular-nums text-white mb-1">{score}</div>
          {tier && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-widest uppercase mt-1"
              style={{ color: tier.color, border: `1px solid ${tier.color}40`, background: `${tier.color}10` }}
            >
              <Trophy size={9} />
              {tier.label}
            </motion.div>
          )}
          {highScore > score && (
            <p className="text-xs text-white/30 font-light mt-2">
              Best: {highScore}
            </p>
          )}
          {score === highScore && highScore > 0 && (
            <p className="text-xs font-light mt-2" style={{ color: '#9945FF' }}>
              New personal best!
            </p>
          )}
        </div>

        {/* Thresholds hint */}
        <div className="flex gap-2 justify-center mb-6">
          {[
            { label: 'Bronze', score: game.bronzeScore, color: '#CD7F32' },
            { label: 'Silver', score: game.silverScore, color: '#C0C0C0' },
            { label: 'Gold', score: game.goldScore, color: '#FFD700' },
          ].map((t) => (
            <div
              key={t.label}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] tracking-wider"
              style={{
                color: score >= t.score ? t.color : 'rgba(255,255,255,0.2)',
                border: `1px solid ${score >= t.score ? t.color + '50' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <span>{score >= t.score ? '✓' : '○'}</span>
              <span>{t.score}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {/* Submit score */}
          <button
            onClick={isDone ? undefined : submit}
            disabled={isSubmitting || isDone}
            className="w-full h-11 rounded-xl text-sm font-medium transition-all"
            style={{
              background: isDone ? 'rgba(20,241,149,0.15)' : 'hsl(var(--primary))',
              color: isDone ? '#14F195' : '#fff',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                {statusLabel}
              </span>
            ) : (
              statusLabel
            )}
          </button>

          {error && (
            <p className="text-[11px] text-red-400/80 text-center font-light">{error}</p>
          )}

          {/* Tip creator */}
          <TipButton
            creatorName={game.creator.name}
            creatorAddress={game.creator.address}
          />

          {/* View leaderboard */}
          <button
            onClick={onLeaderboard}
            className="w-full h-10 rounded-xl text-xs font-light text-white/40 border border-white/08 flex items-center justify-center gap-1.5 hover:text-white/60 hover:border-white/15 transition-all"
          >
            <ExternalLink size={11} />
            View Leaderboard
          </button>
        </div>
      </div>
    </motion.div>
  )
}
