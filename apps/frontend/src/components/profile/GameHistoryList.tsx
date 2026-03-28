import { motion } from 'motion/react'
import { useUserStore } from '@/stores/userStore'
import { CheckCircle2, Clock } from 'lucide-react'

export function GameHistoryList() {
  const { gameHistory } = useUserStore()

  if (gameHistory.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-xs font-light text-muted-foreground">
          No games played yet. Head to the feed!
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {gameHistory.slice(0, 20).map((entry, i) => {
        const date = new Date(entry.timestamp)
        const timeAgo = formatTimeAgo(date)
        return (
          <motion.div
            key={`${entry.gameId}-${entry.timestamp}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center justify-between px-5 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/04 border border-white/08 flex items-center justify-center">
                <span className="text-[10px] font-light text-white/40">
                  {entry.gameName.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-xs font-light text-foreground">{entry.gameName}</p>
                <p className="text-[10px] text-muted-foreground font-light flex items-center gap-1">
                  <Clock size={8} />
                  {timeAgo}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-light tabular-nums text-foreground/80">
                {entry.score}
              </span>
              {entry.submitted && (
                <CheckCircle2 size={11} className="text-primary/60" />
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
