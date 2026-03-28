import { motion, AnimatePresence } from 'motion/react'
import { X, Plus, Check, Clock } from 'lucide-react'
import { useCreatorStore } from '@/stores/creatorStore'

interface CreatorHistoryProps {
  onClose: () => void
  onNewGame: () => void
  onResumeGame: (id: string) => void
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function CreatorHistory({ onClose, onNewGame, onResumeGame }: CreatorHistoryProps) {
  const games = useCreatorStore((s) => s.games)
  const activeGameId = useCreatorStore((s) => s.activeGameId)
  const deleteGame = useCreatorStore((s) => s.deleteGame)

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 350, damping: 38 }}
      className="absolute right-0 top-0 bottom-0 w-72 bg-background border-l border-border/40 z-30 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <span className="text-xs font-light text-foreground">Game History</span>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full bg-muted/20 flex items-center justify-center hover:bg-muted/40 transition-colors"
        >
          <X size={12} className="text-muted-foreground" />
        </button>
      </div>

      {/* New game button */}
      <div className="px-3 py-2 border-b border-border/20">
        <button
          onClick={onNewGame}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/20 text-primary/80 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all text-xs font-light"
        >
          <Plus size={13} />
          New Game
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-2">
        {games.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
            <p className="text-xs font-light text-muted-foreground/50 text-center">
              No games yet — start creating!
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {games.map((game) => {
              const isActive = game.id === activeGameId
              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`mx-2 mb-1 rounded-xl border transition-all ${
                    isActive
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-transparent hover:border-border/30 hover:bg-muted/10'
                  }`}
                >
                  <div className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-light text-foreground truncate">{game.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock size={9} className="text-muted-foreground/40" />
                          <span className="text-[9px] font-light text-muted-foreground/50">
                            {timeAgo(game.createdAt)}
                          </span>
                          {game.publishedToFeed && (
                            <>
                              <span className="text-muted-foreground/30">·</span>
                              <span className="text-[9px] font-light text-[#14F195]/70 flex items-center gap-0.5">
                                <Check size={8} />
                                Published
                              </span>
                            </>
                          )}
                        </div>
                        {game.code && (
                          <p className="text-[9px] font-light text-muted-foreground/30 mt-0.5">
                            {game.chatHistory.filter((m) => m.role === 'user').length} messages ·{' '}
                            {Math.round(game.code.length / 100) / 10}k chars
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button
                          onClick={() => onResumeGame(game.id)}
                          className="text-[9px] font-light text-primary/70 hover:text-primary transition-colors px-1.5 py-0.5 rounded-md hover:bg-primary/10"
                        >
                          {isActive ? 'Active' : 'Resume'}
                        </button>
                        {!isActive && (
                          <button
                            onClick={() => deleteGame(game.id)}
                            className="text-[9px] font-light text-muted-foreground/40 hover:text-red-400 transition-colors px-1.5 py-0.5 rounded-md hover:bg-red-400/10"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  )
}
