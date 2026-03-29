import { Play, Square, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Toolbar3DProps {
  playing: boolean
  streaming: boolean
  onPlay: () => void
  onStop: () => void
  onToggleChat: () => void
  chatOpen: boolean
}

export function Toolbar3D({ playing, streaming, onPlay, onStop, onToggleChat, chatOpen }: Toolbar3DProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10 flex-shrink-0 bg-black/30">
      {/* Play / Stop */}
      <div className="flex items-center gap-1">
        {playing ? (
          <button
            onClick={onStop}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all"
          >
            <Square size={10} className="fill-red-400" />
            Stop
          </button>
        ) : (
          <button
            onClick={onPlay}
            disabled={streaming}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all',
              streaming
                ? 'text-white/20 border-white/10 cursor-not-allowed'
                : 'text-[#14F195] bg-[#14F195]/10 hover:bg-[#14F195]/20 border-[#14F195]/20',
            )}
          >
            <Play size={10} className="fill-current" />
            Play
          </button>
        )}
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Mode indicator */}
      <span className="text-[9px] font-light text-white/30 uppercase tracking-widest">
        {playing ? '▶ Playing' : streaming ? '⟳ Building scene…' : '✎ Editor'}
      </span>

      <div className="ml-auto">
        <button
          onClick={onToggleChat}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-light border transition-all',
            chatOpen
              ? 'text-primary border-primary/30 bg-primary/10'
              : 'text-white/40 border-white/10 hover:border-white/20 hover:text-white/60',
          )}
        >
          <MessageSquare size={10} />
          Chat
        </button>
      </div>
    </div>
  )
}
