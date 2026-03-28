import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { History, Rocket, Eye } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { GameTypeSelector } from '@/components/creator/GameTypeSelector'
import { CreatorChat } from '@/components/creator/CreatorChat'
import { CodeEditor } from '@/components/creator/CodeEditor'
import { GamePreview } from '@/components/creator/GamePreview'
import { CreatorHistory } from '@/components/creator/CreatorHistory'
import { useCreatorStore } from '@/stores/creatorStore'
import { useFeedStore } from '@/stores/feedStore'
import type { FeedGame } from '@/lib/mockData'

type CreatorView = 'type-select' | 'chat' | 'code'

export function CreatorPage() {
  const { publicKey } = useWallet()
  const games = useCreatorStore((s) => s.games)
  const activeGameId = useCreatorStore((s) => s.activeGameId)
  const startNewGame = useCreatorStore((s) => s.startNewGame)
  const setActiveGame = useCreatorStore((s) => s.setActiveGame)
  const markPublished = useCreatorStore((s) => s.markPublished)

  const addGame = useFeedStore((s) => s.addGame)

  const activeGame = games.find((g) => g.id === activeGameId) ?? null

  const [view, setView] = useState<CreatorView>(
    activeGameId && activeGame ? 'chat' : 'type-select',
  )
  const [showPreview, setShowPreview] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)

  function handleTypeSelect() {
    const id = startNewGame()
    setView('chat')
    void id
  }

  function handleNewGame() {
    setShowHistory(false)
    setView('type-select')
  }

  function handleResumeGame(id: string) {
    setActiveGame(id)
    setView('chat')
    setShowHistory(false)
  }

  function handlePublish() {
    if (!activeGame?.code || !activeGameId) return
    const addr = publicKey?.toBase58() ?? ''
    const short = addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : 'creator'
    const feedGame: FeedGame = {
      id: `ai-${activeGameId}`,
      slug: `ai-${activeGameId}`,
      name: activeGame.name,
      description: activeGame.description || 'AI-generated game',
      creator: {
        name: short,
        address: addr || 'unknown',
        avatarColor: '#9945FF',
        initials: short.slice(0, 2).toUpperCase(),
      },
      tags: ['AI-Generated', '2D'],
      playCount: 0,
      totalTips: 0,
      bgColor: '#0d0d0d',
      bgColor2: '#1a0a2e',
      leaderboardAddress: '',
      tipJarAddress: '',
      rewardMintAddress: '',
      bronzeScore: 10,
      silverScore: 50,
      goldScore: 100,
    }
    addGame(feedGame)
    markPublished(activeGameId)
    setPublishSuccess(true)
    setTimeout(() => setPublishSuccess(false), 2500)
  }

  const hasCode = !!(activeGame?.code)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="h-full relative overflow-hidden"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-light text-muted-foreground uppercase tracking-widest">
            AI Creator
          </span>
          {activeGame && view !== 'type-select' && (
            <>
              <span className="text-muted-foreground/30">/</span>
              <span className="text-xs font-light text-foreground/70 truncate max-w-[120px]">
                {activeGame.name}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {hasCode && view !== 'type-select' && (
            <AnimatePresence>
              {publishSuccess ? (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-light text-[#14F195] px-2"
                >
                  Published to Feed!
                </motion.span>
              ) : (
                <button
                  onClick={handlePublish}
                  disabled={activeGame?.publishedToFeed}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-[#14F195]/80 bg-[#14F195]/10 hover:bg-[#14F195]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Rocket size={10} />
                  {activeGame?.publishedToFeed ? 'Published' : 'Publish to Feed'}
                </button>
              )}
            </AnimatePresence>
          )}
          {games.length > 0 && (
            <button
              onClick={() => setShowHistory((v) => !v)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                showHistory ? 'bg-primary/20 text-primary' : 'hover:bg-muted/20 text-muted-foreground'
              }`}
            >
              <History size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="h-[calc(100%-44px)] relative">
        <AnimatePresence mode="wait">
          {view === 'type-select' && (
            <motion.div
              key="type-select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <GameTypeSelector onSelect={handleTypeSelect} />
            </motion.div>
          )}

          {view === 'chat' && activeGameId && (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <CreatorChat
                gameId={activeGameId}
                onEditCode={() => setView('code')}
                onPreview={() => setShowPreview(true)}
              />
            </motion.div>
          )}

          {view === 'code' && activeGameId && (
            <motion.div
              key="code"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <CodeEditor
                gameId={activeGameId}
                onBack={() => setView('chat')}
                onPreview={() => setShowPreview(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating preview button (bottom-right) */}
        {hasCode && view !== 'type-select' && !showPreview && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setShowPreview(true)}
            className="absolute bottom-5 right-5 z-20 flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-black text-xs font-medium shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all"
          >
            <Eye size={13} />
            Preview
          </motion.button>
        )}

        {/* History sidebar */}
        <AnimatePresence>
          {showHistory && (
            <CreatorHistory
              onClose={() => setShowHistory(false)}
              onNewGame={handleNewGame}
              onResumeGame={handleResumeGame}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Full-screen preview overlay */}
      <AnimatePresence>
        {showPreview && activeGame?.code && (
          <GamePreview code={activeGame.code} onClose={() => setShowPreview(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
