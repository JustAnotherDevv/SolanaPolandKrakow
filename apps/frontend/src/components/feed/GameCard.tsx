import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Play, Users, Coins } from 'lucide-react'
import { useGame } from '@/hooks/useGame'
import { useGameStore } from '@/stores/gameStore'
import { GameCanvas } from './GameCanvas'
import { GameOverlay } from './GameOverlay'
import { GameOverScreen } from './GameOverScreen'
import { ShareButton } from '@/components/social/ShareButton'
import type { FeedGame } from '@/lib/mockData'

type CardState = 'preview' | 'playing' | 'gameover'

interface GameCardProps {
  game: FeedGame
  isActive: boolean
  onLeaderboard: (game: FeedGame) => void
}

export function GameCard({ game, isActive, onLeaderboard }: GameCardProps) {
  const [cardState, setCardState] = useState<CardState>('preview')
  const { sdk } = useGame(game)
  const { status, resetGame } = useGameStore()
  const cardRef = useRef<HTMLDivElement>(null)

  // Sync gameover status → show GameOverScreen
  useEffect(() => {
    if (status === 'gameover' && cardState === 'playing') {
      setCardState('gameover')
    }
  }, [status, cardState])

  // Pause game when card scrolls off-screen
  useEffect(() => {
    if (cardState !== 'playing') return
    // If card becomes inactive (another card is scrolled to) pause the game
    // The game classes internally handle paused state via pause()/resume()
  }, [isActive, cardState])

  function handlePlay() {
    setCardState('playing')
  }

  function handleClose() {
    resetGame()
    setCardState('preview')
  }

  return (
    <div
      ref={cardRef}
      className="relative w-full h-full snap-start flex-shrink-0 overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${game.bgColor} 0%, ${game.bgColor2} 100%)`,
      }}
    >
      {/* Game canvas — only mounted while playing or gameover */}
      {(cardState === 'playing' || cardState === 'gameover') && (
        <div className="absolute inset-0">
          <GameCanvas slug={game.slug} sdk={sdk} />
          <GameOverlay gameName={game.name} />
        </div>
      )}

      {/* Preview overlay */}
      <AnimatePresence>
        {cardState === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 flex flex-col justify-between p-5"
          >
            {/* Top: meta */}
            <div className="flex items-start justify-between">
              <div className="flex flex-wrap gap-1.5">
                {game.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-[9px] font-light tracking-widest uppercase border border-white/15 text-white/40"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <ShareButton game={game} />
            </div>

            {/* Center: play button */}
            <div className="flex flex-col items-center gap-4">
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={handlePlay}
                className="w-16 h-16 rounded-full flex items-center justify-center border border-white/20 backdrop-blur-sm"
                style={{ background: 'rgba(153,69,255,0.2)' }}
              >
                <Play size={24} fill="rgba(153,69,255,0.9)" stroke="none" className="ml-1" />
              </motion.button>
              <p className="text-[11px] text-white/30 font-light">tap to play</p>
            </div>

            {/* Bottom: game info */}
            <div>
              {/* Creator row */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium text-white"
                  style={{ background: game.creator.avatarColor + '40', border: `1px solid ${game.creator.avatarColor}40` }}
                >
                  {game.creator.initials}
                </div>
                <span className="text-xs font-light text-white/50">{game.creator.name}</span>
              </div>

              <h2 className="text-xl font-light text-white mb-1.5">{game.name}</h2>
              <p className="text-xs font-light text-white/40 leading-relaxed mb-4 line-clamp-2">
                {game.description}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-white/30">
                  <Users size={11} strokeWidth={1.25} />
                  <span className="text-[11px] font-light tabular-nums">
                    {(game.playCount / 1000).toFixed(1)}k
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-white/30">
                  <Coins size={11} strokeWidth={1.25} />
                  <span className="text-[11px] font-light tabular-nums">
                    {game.totalTips.toFixed(1)} ◎
                  </span>
                </div>
                {/* Reward tiers */}
                <div className="flex items-center gap-1 ml-auto">
                  {[
                    { score: game.bronzeScore, color: '#CD7F32' },
                    { score: game.silverScore, color: '#C0C0C0' },
                    { score: game.goldScore, color: '#FFD700' },
                  ].map((t, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: t.color + '60' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game over screen */}
      <AnimatePresence>
        {cardState === 'gameover' && (
          <GameOverScreen
            game={game}
            onClose={handleClose}
            onLeaderboard={() => onLeaderboard(game)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
