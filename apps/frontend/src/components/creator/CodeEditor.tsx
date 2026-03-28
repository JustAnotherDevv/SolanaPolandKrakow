import { useState, useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { motion } from 'motion/react'
import { Eye, RotateCcw, Lock } from 'lucide-react'
import { useCreatorStore } from '@/stores/creatorStore'
import { AssetGallery } from './AssetGallery'
import { cn } from '@/lib/utils'

interface CodeEditorProps {
  gameId: string
  onPreview: (code?: string) => void
}

export function CodeEditor({ gameId, onPreview }: CodeEditorProps) {
  const game = useCreatorStore((s) => s.games.find((g) => g.id === gameId))
  const updateCode = useCreatorStore((s) => s.updateCode)
  const restoreVersion = useCreatorStore((s) => s.restoreVersion)

  const versions = game?.versions ?? []
  const currentVersionId = game?.currentVersionId

  // Which version is being viewed in the editor (may differ from active)
  const [viewingVersionId, setViewingVersionId] = useState<string | null>(
    currentVersionId ?? null,
  )

  const viewingVersion = versions.find((v) => v.id === viewingVersionId)
  const isViewingActive = viewingVersionId === currentVersionId

  const [localCode, setLocalCode] = useState(viewingVersion?.code ?? game?.code ?? '')
  const [isDirty, setIsDirty] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync when viewed version changes
  useEffect(() => {
    const code = viewingVersion?.code ?? game?.code ?? ''
    setLocalCode(code)
    setIsDirty(false)
  }, [viewingVersionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync when active version changes externally (e.g. restore from chat)
  useEffect(() => {
    setViewingVersionId(currentVersionId ?? null)
  }, [currentVersionId])

  function handleChange(value: string) {
    if (!isViewingActive) return // read-only for non-active versions
    setLocalCode(value)
    setIsDirty(value !== (game?.code ?? ''))

    // Auto-save debounce
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => {
      updateCode(gameId, value)
      setIsDirty(false)
      setSavedFeedback(true)
      setTimeout(() => setSavedFeedback(false), 1000)
    }, 800)
  }

  function handleRestoreToEdit() {
    if (!viewingVersionId) return
    restoreVersion(gameId, viewingVersionId)
    setIsDirty(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 flex-shrink-0 overflow-x-auto no-scrollbar">
        {/* Version pills */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => setViewingVersionId(v.id)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[10px] font-light transition-all whitespace-nowrap',
                viewingVersionId === v.id
                  ? v.id === currentVersionId
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-muted/30 text-foreground border border-border/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/15 border border-transparent',
              )}
            >
              {v.label}
              {v.id === currentVersionId && (
                <span className="ml-1 text-primary/60">●</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Status + actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!isViewingActive && viewingVersion && (
            <div className="flex items-center gap-1 text-[9px] font-light text-amber-400/70">
              <Lock size={9} />
              <span>Read-only</span>
            </div>
          )}
          {isDirty && (
            <span className="text-[9px] font-light text-muted-foreground/50">
              · unsaved
            </span>
          )}
          {savedFeedback && (
            <span className="text-[9px] font-light text-[#14F195]/70">Saved</span>
          )}

          {!isViewingActive && viewingVersion && (
            <button
              onClick={handleRestoreToEdit}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-light text-primary hover:bg-primary/10 transition-all border border-primary/20"
            >
              <RotateCcw size={9} />
              Restore to edit
            </button>
          )}

          <button
            onClick={() => onPreview(isViewingActive ? undefined : viewingVersion?.code)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-all border border-primary/20"
          >
            <Eye size={11} />
            {isViewingActive ? 'Preview' : `Preview ${viewingVersion?.label}`}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden relative">
        {!isViewingActive && (
          <div className="absolute inset-x-0 top-0 z-10 px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
            <Lock size={10} className="text-amber-400/70" />
            <span className="text-[9px] font-light text-amber-400/70">
              Viewing {viewingVersion?.label} (read-only) — click "Restore to edit" to make changes
            </span>
          </div>
        )}
        <CodeMirror
          value={localCode}
          onChange={handleChange}
          height="100%"
          theme={oneDark}
          extensions={[javascript({ jsx: false })]}
          readOnly={!isViewingActive}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            autocompletion: isViewingActive,
            bracketMatching: true,
            closeBrackets: isViewingActive,
            indentOnInput: isViewingActive,
          }}
          style={{
            height: '100%',
            fontSize: '11px',
            paddingTop: !isViewingActive ? '28px' : '0',
          }}
        />
      </div>

      <div className="px-4 py-1.5 border-t border-border/15 flex-shrink-0 flex items-center justify-between">
        <p className="text-[8px] font-light text-muted-foreground/25">
          Auto-saves 800ms after typing
        </p>
        {localCode && (
          <p className="text-[8px] font-light text-muted-foreground/25">
            {(localCode.length / 1000).toFixed(1)}k chars
          </p>
        )}
      </div>

      <AssetGallery gameId={gameId} />
    </motion.div>
  )
}
