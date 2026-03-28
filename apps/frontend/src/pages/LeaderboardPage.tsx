import { useState } from 'react'
import { motion } from 'motion/react'
import { BUILT_IN_GAMES } from '@/lib/mockData'
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable'
import type { FeedGame } from '@/lib/mockData'

interface LeaderboardPageProps {
  initialGame?: FeedGame
}

export function LeaderboardPage({ initialGame }: LeaderboardPageProps) {
  const [selected, setSelected] = useState<FeedGame>(initialGame ?? BUILT_IN_GAMES[0])

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full overflow-y-auto no-scrollbar"
    >
      {/* Game selector */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
          {BUILT_IN_GAMES.map((game) => {
            const isActive = game.id === selected.id
            return (
              <button
                key={game.id}
                onClick={() => setSelected(game)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-light tracking-wider transition-all"
                style={{
                  background: isActive ? 'hsl(var(--primary) / 0.15)' : 'transparent',
                  color: isActive ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.35)',
                  border: `1px solid ${isActive ? 'hsl(var(--primary) / 0.4)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {game.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected game info */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-light text-foreground mb-0.5">{selected.name}</h2>
            <p className="text-[11px] text-muted-foreground font-light">Top 10 scores</p>
          </div>
          {/* Reward tiers legend */}
          <div className="flex flex-col gap-1 text-right">
            {[
              { label: 'Gold', score: selected.goldScore, color: '#FFD700' },
              { label: 'Silver', score: selected.silverScore, color: '#C0C0C0' },
              { label: 'Bronze', score: selected.bronzeScore, color: '#CD7F32' },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-1.5 justify-end">
                <span className="text-[9px] font-light" style={{ color: t.color }}>
                  {t.label}
                </span>
                <span className="text-[9px] text-white/25 font-light tabular-nums">≥{t.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <LeaderboardTable key={selected.id} game={selected} />
    </motion.div>
  )
}
