import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { History, Rocket, Eye, MessageSquare, Code2, GitBranch, Box } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { GameTypeSelector } from '@/components/creator/GameTypeSelector'
import { CreatorChat } from '@/components/creator/CreatorChat'
import { CodeEditor } from '@/components/creator/CodeEditor'
import { GamePreview } from '@/components/creator/GamePreview'
import { CreatorHistory } from '@/components/creator/CreatorHistory'
import { VersionTimeline } from '@/components/creator/VersionTimeline'
import { Editor3D } from '@/components/creator3d/Editor3D'
import { useCreatorStore } from '@/stores/creatorStore'
import { useFeedStore } from '@/stores/feedStore'
import type { FeedGame } from '@/lib/mockData'
import { cn } from '@/lib/utils'

type CreatorView = 'type-select' | 'chat' | 'code' | 'versions' | 'editor3d'

interface PreviewState {
  code: string
  versionLabel?: string
}

export function CreatorPage() {
  const { publicKey } = useWallet()
  const games = useCreatorStore((s) => s.games)
  const activeGameId = useCreatorStore((s) => s.activeGameId)
  const startNewGame = useCreatorStore((s) => s.startNewGame)
  const setActiveGame = useCreatorStore((s) => s.setActiveGame)
  const markPublished = useCreatorStore((s) => s.markPublished)
  const addGame = useFeedStore((s) => s.addGame)

  const activeGame = games.find((g) => g.id === activeGameId) ?? null
  const currentVersion = activeGame?.versions.find((v) => v.id === activeGame.currentVersionId)

  const [view, setView] = useState<CreatorView>(() => {
    if (!activeGameId || !activeGame) return 'type-select'
    return activeGame.type === '3d' ? 'editor3d' : 'chat'
  })
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [autoFixMessage, setAutoFixMessage] = useState<string | null>(null)

  function handleTypeSelect(type: '2d' | '3d') {
    startNewGame(type)
    setView(type === '3d' ? 'editor3d' : 'chat')
  }

  function handleNewGame() {
    setShowHistory(false)
    setView('type-select')
  }

  function handleResumeGame(id: string) {
    setActiveGame(id)
    const resumedGame = games.find((g) => g.id === id)
    setView(resumedGame?.type === '3d' ? 'editor3d' : 'chat')
    setShowHistory(false)
  }

  function handleFixError(error: string, code: string) {
    setPreview(null)
    setView('chat')
    const msg = `[FIX_ERROR]\nRuntime error: ${error}\n\nCurrent code:\n${code}`
    setAutoFixMessage(msg)
  }

  function openPreview(codeOverride?: string) {
    const code = activeGame?.code ?? ''
    if (!code && !codeOverride) return
    if (codeOverride) {
      const vLabel = activeGame?.versions.find((v) => v.code === codeOverride)?.label
      setPreview({ code: activeGame?.code ?? '', versionLabel: vLabel })
      // Store codeOverride via a trick: set preview with the override as the main code
      setPreview({ code: codeOverride, versionLabel: vLabel })
    } else {
      setPreview({ code, versionLabel: currentVersion?.label })
    }
  }

  function handlePublish() {
    if (!activeGame?.code || !activeGameId) return
    const addr = publicKey?.toBase58() ?? ''
    const short = addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : 'AI'
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
  const versionCount = activeGame?.versions.length ?? 0

  const is3D = activeGame?.type === '3d'
  const isFullscreenEditor = is3D && view === 'editor3d'

  const TABS = is3D
    ? [
        { id: 'editor3d' as const, icon: Box, label: 'Scene' },
        { id: 'versions' as const, icon: GitBranch, label: `Versions${versionCount > 0 ? ` (${versionCount})` : ''}` },
      ]
    : [
        { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
        { id: 'code' as const, icon: Code2, label: 'Code' },
        { id: 'versions' as const, icon: GitBranch, label: `Versions${versionCount > 0 ? ` (${versionCount})` : ''}` },
      ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="h-full relative overflow-hidden flex flex-col"
    >
      {/* Top bar — hidden for fullscreen 3D editor */}
      {!isFullscreenEditor && <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-light text-muted-foreground/40 uppercase tracking-widest flex-shrink-0">
            AI Creator
          </span>
          {activeGame && view !== 'type-select' && (
            <>
              <span className="text-muted-foreground/20">/</span>
              <span className="text-xs font-light text-foreground/60 truncate max-w-[120px]">
                {activeGame.name}
              </span>
              {currentVersion && (
                <span className="text-[9px] font-light text-primary/50 flex-shrink-0">
                  {currentVersion.label}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {hasCode && view !== 'type-select' && (
            <AnimatePresence mode="wait">
              {publishSuccess ? (
                <motion.span
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-light text-[#14F195] px-2"
                >
                  Published to Feed!
                </motion.span>
              ) : (
                <motion.button
                  key="publish"
                  onClick={handlePublish}
                  disabled={activeGame?.publishedToFeed}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-[#14F195]/70 bg-[#14F195]/8 hover:bg-[#14F195]/15 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-[#14F195]/15"
                >
                  <Rocket size={10} />
                  {activeGame?.publishedToFeed ? 'Published' : 'Publish'}
                </motion.button>
              )}
            </AnimatePresence>
          )}

          {games.length > 0 && (
            <button
              onClick={() => setShowHistory((v) => !v)}
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                showHistory ? 'bg-primary/20 text-primary' : 'text-muted-foreground/50 hover:bg-muted/20 hover:text-muted-foreground',
              )}
              title="Game library"
            >
              <History size={14} />
            </button>
          )}
        </div>
      </div>}

      {/* Tab bar — only when a game is active, hidden for fullscreen 3D editor */}
      {!isFullscreenEditor && view !== 'type-select' && activeGameId && (
        <div className="flex items-center px-4 border-b border-border/20 flex-shrink-0 bg-background/50">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-2 text-[10px] font-light transition-all',
                view === id ? 'text-foreground' : 'text-muted-foreground/50 hover:text-muted-foreground',
              )}
            >
              <Icon size={11} />
              {label}
              {view === id && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-px bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
            </button>
          ))}

          {/* Floating preview button in tab bar — 2D only */}
          {hasCode && !is3D && (
            <button
              onClick={() => openPreview()}
              className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-primary hover:bg-primary/10 transition-all"
            >
              <Eye size={11} />
              Preview
            </button>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden relative">
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
                onPreview={openPreview}
                autoSend={autoFixMessage}
                onAutoSendConsumed={() => setAutoFixMessage(null)}
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
                onPreview={openPreview}
              />
            </motion.div>
          )}

          {view === 'editor3d' && activeGameId && (
            <motion.div
              key="editor3d"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <Editor3D gameId={activeGameId} />
            </motion.div>
          )}

          {view === 'versions' && activeGameId && (
            <motion.div
              key="versions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <VersionTimeline
                gameId={activeGameId}
                onPreview={(code) => {
                  const vLabel = activeGame?.versions.find((v) => v.code === code)?.label
                  setPreview({ code, versionLabel: vLabel })
                }}
                onRestored={() => setView(is3D ? 'editor3d' : 'chat')}
              />
            </motion.div>
          )}
        </AnimatePresence>

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
        {preview && (
          <GamePreview
            code={preview.code}
            versionLabel={preview.versionLabel}
            onClose={() => setPreview(null)}
            onFixError={activeGameId ? handleFixError : undefined}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
