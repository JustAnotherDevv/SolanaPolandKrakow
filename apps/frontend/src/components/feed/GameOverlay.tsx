import { Heart } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/stores/gameStore'

interface GameOverlayProps {
  gameName: string
}

export function GameOverlay({ gameName }: GameOverlayProps) {
  const { lives, status } = useGameStore()
  const isPlaying = status === 'playing'

  return (
    <AnimatePresence>
      {isPlaying && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute top-0 left-0 right-0 pointer-events-none z-10"
        >
          {/* Top strip: game name + score */}
          <div className="flex items-center justify-between px-4 pt-2 pb-1">
            <span className="text-[10px] font-light text-white/40 uppercase tracking-widest">
              {gameName}
            </span>
            <div className="flex items-center gap-2">
              {/* Lives */}
              {lives > 0 && lives <= 5 && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: lives }).map((_, i) => (
                    <Heart key={i} size={8} fill="#9945FF" stroke="none" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
