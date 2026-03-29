import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, MessageSquare, Code2, GitBranch, Box } from 'lucide-react'
import { GameTypeSelector } from '@/components/creator/GameTypeSelector'
import { CreatorChat } from '@/components/creator/CreatorChat'
import { CodeEditor } from '@/components/creator/CodeEditor'
import { GamePreview } from '@/components/creator/GamePreview'
import { CreatorHistory } from '@/components/creator/CreatorHistory'
import { VersionTimeline } from '@/components/creator/VersionTimeline'
import { Editor3D } from '@/components/creator3d/Editor3D'
import { useCreatorStore } from '@/stores/creatorStore'
import { cn } from '@/lib/utils'

type CreatorView = 'type-select' | 'chat' | 'code' | 'versions' | 'editor3d'

interface PreviewState {
  code: string
  versionLabel?: string
}

export function CreatorPage() {
  const games          = useCreatorStore((s) => s.games)
  const activeGameId   = useCreatorStore((s) => s.activeGameId)
  const startNewGame   = useCreatorStore((s) => s.startNewGame)
  const setActiveGame  = useCreatorStore((s) => s.setActiveGame)
  const showHistory    = useCreatorStore((s) => s.showHistory)
  const setShowHistory = useCreatorStore((s) => s.setShowHistory)

  const activeGame     = games.find((g) => g.id === activeGameId) ?? null

  const [view, setView] = useState<CreatorView>(() => {
    if (!activeGameId || !activeGame) return 'type-select'
    return activeGame.type === '3d' ? 'editor3d' : 'chat'
  })
  const [preview, setPreview] = useState<PreviewState | null>(null)
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
    setAutoFixMessage(`[FIX_ERROR]\nRuntime error: ${error}\n\nCurrent code:\n${code}`)
  }

  function openPreview(codeOverride?: string) {
    const code = activeGame?.code ?? ''
    if (!code && !codeOverride) return
    if (codeOverride) {
      const vLabel = activeGame?.versions.find((v) => v.code === codeOverride)?.label
      setPreview({ code: codeOverride, versionLabel: vLabel })
    } else {
      const currentVersion = activeGame?.versions.find((v) => v.id === activeGame.currentVersionId)
      setPreview({ code, versionLabel: currentVersion?.label })
    }
  }

  const hasCode      = !!(activeGame?.code)
  const versionCount = activeGame?.versions.length ?? 0
  const is3D         = activeGame?.type === '3d'

  const TABS = is3D
    ? [
        { id: 'editor3d' as const, icon: Box,        label: 'Scene' },
        { id: 'versions' as const, icon: GitBranch,  label: `Versions${versionCount > 0 ? ` (${versionCount})` : ''}` },
      ]
    : [
        { id: 'chat'     as const, icon: MessageSquare, label: 'Chat' },
        { id: 'code'     as const, icon: Code2,         label: 'Code' },
        { id: 'versions' as const, icon: GitBranch,     label: `Versions${versionCount > 0 ? ` (${versionCount})` : ''}` },
      ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="h-full relative overflow-hidden flex flex-col"
    >
      {/* Tab bar — only when a game is active */}
      {view !== 'type-select' && activeGameId && (
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

          {/* Preview button — 2D only */}
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
        {/* 3D Editor — kept mounted (CSS hidden) to preserve Three.js + SSE streams */}
        {activeGameId && activeGame?.type === '3d' && (
          <div style={{ display: view === 'editor3d' ? 'block' : 'none', height: '100%' }}>
            <Editor3D gameId={activeGameId} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'type-select' && (
            <motion.div key="type-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <GameTypeSelector onSelect={handleTypeSelect} />
            </motion.div>
          )}

          {view === 'chat' && activeGameId && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <CreatorChat
                gameId={activeGameId}
                onPreview={openPreview}
                autoSend={autoFixMessage}
                onAutoSendConsumed={() => setAutoFixMessage(null)}
              />
            </motion.div>
          )}

          {view === 'code' && activeGameId && (
            <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <CodeEditor gameId={activeGameId} onPreview={openPreview} />
            </motion.div>
          )}

          {/* editor3d is rendered above with CSS display — skip it here */}

          {view === 'versions' && activeGameId && (
            <motion.div key="versions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
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
