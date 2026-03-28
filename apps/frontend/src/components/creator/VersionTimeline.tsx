import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, RotateCcw, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useCreatorStore } from '@/stores/creatorStore'
import type { CodeVersion } from '@/stores/creatorStore'
import { cn } from '@/lib/utils'

interface VersionTimelineProps {
  gameId: string
  onPreview: (code: string) => void
  onRestored: () => void // navigate to chat after restore
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

function MiniCodePreview({ code }: { code: string }) {
  const lines = code.split('\n').slice(0, 10)
  return (
    <pre className="text-[9px] font-mono text-green-300/60 leading-relaxed overflow-hidden whitespace-pre-wrap break-all">
      {lines.join('\n')}
      {code.split('\n').length > 10 && '\n…'}
    </pre>
  )
}

function VersionRow({
  version,
  gameId,
  isActive,
  onPreview,
  onRestored,
}: {
  version: CodeVersion
  gameId: string
  isActive: boolean
  onPreview: (code: string) => void
  onRestored: () => void
}) {
  const restoreVersion = useCreatorStore((s) => s.restoreVersion)
  const renameVersion = useCreatorStore((s) => s.renameVersion)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(version.label)
  const [justRestored, setJustRestored] = useState(false)

  function handleRestore() {
    restoreVersion(gameId, version.id)
    setJustRestored(true)
    setTimeout(() => {
      setJustRestored(false)
      onRestored()
    }, 800)
  }

  function handleRenameSubmit() {
    if (editLabel.trim()) renameVersion(gameId, version.id, editLabel.trim())
    setEditing(false)
  }

  return (
    <motion.div
      layout
      className={cn(
        'rounded-xl border transition-all overflow-hidden',
        isActive ? 'border-primary/30 bg-primary/5' : 'border-border/20 bg-muted/5 hover:border-border/40',
      )}
    >
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Version label */}
        <div className="flex-shrink-0 w-8">
          {editing ? (
            <input
              autoFocus
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit()
                if (e.key === 'Escape') { setEditing(false); setEditLabel(version.label) }
              }}
              className="bg-transparent outline-none w-full border-b border-primary/50 text-xs text-primary font-medium"
            />
          ) : (
            <button
              onDoubleClick={() => { setEditLabel(version.label); setEditing(true) }}
              title="Double-click to rename"
              className={cn(
                'text-xs font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {version.label}
            </button>
          )}
        </div>

        {/* Status */}
        {isActive && (
          <span className="flex items-center gap-1 text-[9px] font-medium text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">
            <Check size={8} />
            Active
          </span>
        )}

        {/* Timestamp + size */}
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-light text-muted-foreground/50">
            {timeAgo(version.createdAt)}
          </span>
          <span className="text-muted-foreground/30 mx-1.5">·</span>
          <span className="text-[9px] font-light text-muted-foreground/40">
            {(version.code.length / 1000).toFixed(1)}k chars
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onPreview(version.code)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-light text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all"
            title="Preview this version"
          >
            <Eye size={11} />
            Preview
          </button>

          {!isActive && (
            justRestored ? (
              <span className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#14F195]">
                <Check size={10} />
                Restored
              </span>
            ) : (
              <button
                onClick={handleRestore}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-light text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                title="Restore this version"
              >
                <RotateCcw size={10} />
                Restore
              </button>
            )
          )}

          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/20 transition-all"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Expandable code preview */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/20 bg-black/30 px-4 py-3"
          >
            <MiniCodePreview code={version.code} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function VersionTimeline({ gameId, onPreview, onRestored }: VersionTimelineProps) {
  const game = useCreatorStore((s) => s.games.find((g) => g.id === gameId))
  const versions = game?.versions ?? []
  const currentVersionId = game?.currentVersionId

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
        <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center">
          <Eye size={18} className="text-muted-foreground/40" />
        </div>
        <p className="text-xs font-light text-muted-foreground/50 text-center">
          No versions yet — chat with AI to generate your first version
        </p>
      </div>
    )
  }

  // Show newest first
  const sorted = [...versions].reverse()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col"
    >
      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-xs font-light text-foreground">Version History</h3>
          <p className="text-[9px] font-light text-muted-foreground/50 mt-0.5">
            {versions.length} version{versions.length !== 1 ? 's' : ''} · double-click label to rename
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-2">
        {sorted.map((version) => (
          <VersionRow
            key={version.id}
            version={version}
            gameId={gameId}
            isActive={version.id === currentVersionId}
            onPreview={onPreview}
            onRestored={onRestored}
          />
        ))}
      </div>
    </motion.div>
  )
}
