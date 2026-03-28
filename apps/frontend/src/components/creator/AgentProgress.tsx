import { motion, AnimatePresence } from 'motion/react'
import type { AgentStepItem, GeneratedAsset } from '@/hooks/useAgentStream'
import { cn } from '@/lib/utils'

interface AgentProgressProps {
  steps: AgentStepItem[]
  assets: GeneratedAsset[]
  streaming: boolean
}

export function AgentProgress({ steps, assets, streaming }: AgentProgressProps) {
  if (steps.length === 0 && !streaming) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mx-4 mb-3 rounded-2xl border border-border/25 bg-muted/5 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/15">
        <div className="flex items-center gap-1.5">
          {streaming && (
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1 h-1 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </span>
          )}
          <span className="text-[9px] font-medium text-foreground/50 uppercase tracking-wider">
            {streaming ? 'Agent working…' : 'Agent done'}
          </span>
        </div>
        {assets.length > 0 && (
          <span className="text-[9px] font-light text-muted-foreground/40">
            {assets.length} asset{assets.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Steps */}
      <div className="px-3 py-2 space-y-1 max-h-40 overflow-y-auto no-scrollbar">
        <AnimatePresence initial={false}>
          {steps.map((step) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'flex items-start gap-2',
                step.done ? 'opacity-60' : '',
              )}
            >
              <span className="text-[10px] flex-shrink-0 mt-0.5">{step.icon ?? '·'}</span>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-[10px] font-light text-foreground/60 truncate">
                  {step.message}
                </span>
                {step.assetUrl && (
                  <img
                    src={step.assetUrl}
                    alt={step.name}
                    className="w-6 h-6 rounded object-cover flex-shrink-0 border border-border/20"
                  />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Asset strip */}
      {assets.length > 0 && (
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {assets.map((asset) => (
            <div key={asset.assetId} className="flex-shrink-0">
              <img
                src={asset.url}
                alt={asset.name}
                title={asset.name}
                className="w-10 h-10 rounded-lg object-cover border border-border/20 bg-black/20"
              />
              <p className="text-[8px] font-light text-muted-foreground/40 text-center mt-0.5 truncate w-10">
                {asset.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
