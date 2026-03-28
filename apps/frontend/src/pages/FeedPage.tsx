import { useCallback } from 'react'
import { motion } from 'motion/react'
import { useFeedStore } from '@/stores/feedStore'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { GameCard } from '@/components/feed/GameCard'
import { FeedSkeleton } from '@/components/feed/FeedSkeleton'
import type { FeedGame } from '@/lib/mockData'

interface FeedPageProps {
  onLeaderboard: (game: FeedGame) => void
}

export function FeedPage({ onLeaderboard }: FeedPageProps) {
  const { games, currentIndex, loading, loadMore, setCurrentIndex } = useFeedStore()

  const handleLoadMore = useCallback(() => {
    if (!loading) loadMore()
  }, [loading, loadMore])

  const { sentinelRef } = useInfiniteScroll(handleLoadMore, !loading)

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const index = Math.round(el.scrollTop / el.clientHeight)
    if (index !== currentIndex) setCurrentIndex(index)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full overflow-y-scroll no-scrollbar"
      style={{ scrollSnapType: 'y mandatory' }}
      onScroll={handleScroll}
    >
      {games.map((game, i) => (
        <div key={`${game.id}-${i}`} className="w-full h-full snap-start flex-shrink-0">
          <GameCard
            game={game}
            isActive={i === currentIndex}
            onLeaderboard={onLeaderboard}
          />
        </div>
      ))}

      {loading && (
        <div className="snap-start w-full h-full flex-shrink-0">
          <FeedSkeleton />
        </div>
      )}

      <div ref={sentinelRef} className="snap-start h-1 w-full" />
    </motion.div>
  )
}
