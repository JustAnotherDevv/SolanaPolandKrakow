import { Skeleton } from '@/components/ui/skeleton'
import { LeaderboardEntry } from './LeaderboardEntry'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import type { FeedGame } from '@/lib/mockData'

interface LeaderboardTableProps {
  game: FeedGame
}

export function LeaderboardTable({ game }: LeaderboardTableProps) {
  const { entries, loading, userRank } = useLeaderboard(game)

  if (loading) {
    return (
      <div className="px-5 py-4 flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-7 h-4 rounded" />
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="flex-1 h-4 rounded" />
            <Skeleton className="w-10 h-4 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* User rank banner (if not in top 10) */}
      {userRank > 10 && (
        <div className="px-5 py-2 border-b border-white/06">
          <p className="text-xs font-light text-white/30">
            Your rank: <span className="text-white/60">#{userRank}</span>
          </p>
        </div>
      )}

      {entries.map((entry, i) => (
        <LeaderboardEntry key={`${entry.player}-${i}`} entry={entry} rank={i + 1} index={i} />
      ))}

      {entries.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-xs font-light text-white/25">No scores yet. Be the first!</p>
        </div>
      )}
    </div>
  )
}
