import { useState } from 'react'
import { motion } from 'motion/react'
import { Eye, RotateCcw, Check, Pencil } from 'lucide-react'
import { useCreatorStore } from '@/stores/creatorStore'
import type { CodeVersion } from '@/stores/creatorStore'
import { cn } from '@/lib/utils'

interface VersionBadgeProps {
  version: CodeVersion
  gameId: string
  isActive: boolean
  onPreview: (code: string) => void
}

export function VersionBadge({ version, gameId, isActive, onPreview }: VersionBadgeProps) {
  const restoreVersion = useCreatorStore((s) => s.restoreVersion)
  const renameVersion = useCreatorStore((s) => s.renameVersion)
  const [editing, setEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(version.label)
  const [justRestored, setJustRestored] = useState(false)

  function handleRestore() {
    restoreVersion(gameId, version.id)
    setJustRestored(true)
    setTimeout(() => setJustRestored(false), 1500)
  }

  function handleRenameSubmit() {
    if (editLabel.trim()) renameVersion(gameId, version.id, editLabel.trim())
    setEditing(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-lg border text-[10px] font-light',
        isActive
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border/30 bg-muted/10 text-muted-foreground hover:border-border/50',
      )}
    >
      {/* Label / rename */}
      {editing ? (
        <input
          autoFocus
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="bg-transparent outline-none w-14 border-b border-primary/40 text-[10px]"
        />
      ) : (
        <button
          onClick={() => {
            setEditLabel(version.label)
            setEditing(true)
          }}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
          title="Click to rename"
        >
          <span className="font-medium">{version.label}</span>
          <Pencil size={8} className="opacity-40" />
        </button>
      )}

      <span className="text-muted-foreground/30 mx-0.5">·</span>

      {/* Preview button */}
      <button
        onClick={() => onPreview(version.code)}
        className="flex items-center gap-0.5 hover:text-foreground transition-colors px-1 py-0.5 rounded hover:bg-white/10"
        title="Preview this version"
      >
        <Eye size={10} />
        <span>Preview</span>
      </button>

      <span className="text-muted-foreground/30 mx-0.5">·</span>

      {/* Restore / Active */}
      {isActive ? (
        <span className="flex items-center gap-0.5 text-primary font-medium">
          <Check size={9} />
          Active
        </span>
      ) : justRestored ? (
        <span className="flex items-center gap-0.5 text-[#14F195]">
          <Check size={9} />
          Restored
        </span>
      ) : (
        <button
          onClick={handleRestore}
          className="flex items-center gap-0.5 hover:text-foreground transition-colors px-1 py-0.5 rounded hover:bg-white/10"
          title="Restore this version"
        >
          <RotateCcw size={9} />
          <span>Restore</span>
        </button>
      )}
    </motion.div>
  )
}
