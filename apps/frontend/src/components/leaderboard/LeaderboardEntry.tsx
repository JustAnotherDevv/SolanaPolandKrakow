import { motion } from 'motion/react'
import { useWallet } from '@solana/wallet-adapter-react'
import type { ScoreEntry } from '@/lib/anchor/client'

interface LeaderboardEntryProps {
  entry: ScoreEntry
  rank: number
  index: number
}

function truncate(addr: string) {
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']

export function LeaderboardEntry({ entry, rank, index }: LeaderboardEntryProps) {
  const { publicKey } = useWallet()
  const isMe = publicKey?.toBase58() === entry.player
  const rankColor = RANK_COLORS[rank - 1]

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="flex items-center gap-3 px-5 py-3 border-b border-white/04 last:border-0"
      style={isMe ? { background: 'rgba(153,69,255,0.06)' } : undefined}
    >
      {/* Rank */}
      <div className="w-7 text-center">
        {rankColor ? (
          <span className="text-sm font-medium" style={{ color: rankColor }}>
            {rank}
          </span>
        ) : (
          <span className="text-sm font-light text-white/30">{rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0"
        style={{
          background: isMe ? 'rgba(153,69,255,0.3)' : 'rgba(255,255,255,0.06)',
          border: isMe ? '1px solid rgba(153,69,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {entry.player.slice(0, 2).toUpperCase()}
      </div>

      {/* Address */}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-light text-white/60 truncate block">
          {truncate(entry.player)}
          {isMe && <span className="ml-1.5 text-[9px] tracking-wider text-primary/70">you</span>}
        </span>
      </div>

      {/* Score */}
      <span className="text-sm font-light tabular-nums text-white/90">{entry.score}</span>
    </motion.div>
  )
}
