import { Play, Square, MessageSquare, AlertCircle, ChevronDown, TerminalSquare, FileCode } from 'lucide-react'

type TransformMode = 'translate' | 'rotate' | 'scale'

interface Toolbar3DProps {
  playing: boolean
  streaming: boolean
  hasCode: boolean
  onPlay: () => void
  onStop: () => void
  onToggleChat: () => void
  chatOpen: boolean
  playError?: string | null
  onClearError?: () => void
  outputOpen?: boolean
  onToggleOutput?: () => void
  transformMode: TransformMode
  onTransformMode: (m: TransformMode) => void
  codeOpen?: boolean
  onToggleCode?: () => void
}

const GIZMO_MODES: { mode: TransformMode; key: string; label: string; symbol: string; color: string }[] = [
  { mode: 'translate', key: 'W', label: 'Move',   symbol: '⇔', color: '#4ec9b0' },
  { mode: 'rotate',    key: 'E', label: 'Rotate', symbol: '↻', color: '#dcdcaa' },
  { mode: 'scale',     key: 'R', label: 'Scale',  symbol: '⤢', color: '#9cdcfe' },
]

export function Toolbar3D({
  playing, streaming, hasCode,
  onPlay, onStop, onToggleChat, chatOpen,
  playError, onClearError,
  outputOpen, onToggleOutput,
  transformMode, onTransformMode,
  codeOpen, onToggleCode,
}: Toolbar3DProps) {
  const playDisabled = !hasCode || streaming

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '0 10px', height: 34,
        background: '#111116',
        borderBottom: '1px solid #252530',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Gizmo mode buttons — only show in editor mode */}
      {!playing && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {GIZMO_MODES.map(({ mode, key, label, symbol, color }) => {
              const active = transformMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => onTransformMode(mode)}
                  title={`${label} (${key})`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '0 7px', height: 22, borderRadius: 3,
                    fontSize: 10, fontWeight: 500,
                    color: active ? color : '#484852',
                    background: active ? `${color}18` : 'transparent',
                    border: `1px solid ${active ? `${color}40` : '#252530'}`,
                    cursor: 'pointer', transition: 'all 0.12s',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  <span style={{ fontSize: 11 }}>{symbol}</span>
                  <span style={{ fontSize: 9, letterSpacing: '0.04em' }}>{label}</span>
                  <span style={{ fontSize: 7, color: active ? `${color}80` : '#333338', marginLeft: 1 }}>{key}</span>
                </button>
              )
            })}
          </div>

          <div style={{ width: 1, height: 16, background: '#252530', margin: '0 6px' }} />
        </>
      )}

      {/* Play / Stop */}
      {playing ? (
        <button
          onClick={onStop}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '0 10px', height: 22, borderRadius: 3,
            fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
            color: '#f48771',
            background: 'rgba(244,135,113,0.12)',
            border: '1px solid rgba(244,135,113,0.28)',
            cursor: 'pointer',
          }}
        >
          <Square size={8} style={{ fill: '#f48771' }} />
          Stop
        </button>
      ) : (
        <div style={{ position: 'relative' }} className="group">
          <button
            onClick={onPlay}
            disabled={playDisabled}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 12px', height: 22, borderRadius: 3,
              fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
              color: playDisabled ? 'rgba(255,255,255,0.18)' : '#14F195',
              background: playDisabled ? 'rgba(255,255,255,0.03)' : 'rgba(20,241,149,0.1)',
              border: `1px solid ${playDisabled ? 'rgba(255,255,255,0.07)' : 'rgba(20,241,149,0.22)'}`,
              cursor: playDisabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.12s',
            }}
          >
            <Play size={8} style={{ fill: playDisabled ? 'rgba(255,255,255,0.18)' : '#14F195' }} />
            Play
          </button>
          {!hasCode && !streaming && (
            <div
              className="opacity-0 group-hover:opacity-100"
              style={{
                position: 'absolute', left: 0, top: '100%', marginTop: 6,
                background: '#1a1a24', border: '1px solid #3a3a48',
                borderRadius: 5, padding: '5px 10px',
                fontSize: 9, color: 'rgba(255,255,255,0.4)',
                whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 50,
                transition: 'opacity 0.15s',
              }}
            >
              Generate a game first
            </div>
          )}
        </div>
      )}

      <div style={{ width: 1, height: 16, background: '#252530', margin: '0 6px' }} />

      {/* Status / error */}
      {playError ? (
        <button
          onClick={onClearError}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '2px 8px', borderRadius: 3,
            fontSize: 9, color: 'rgba(244,135,113,0.8)',
            background: 'rgba(244,135,113,0.08)', border: '1px solid rgba(244,135,113,0.18)',
            cursor: 'pointer', maxWidth: 220,
          }}
          title={playError}
        >
          <AlertCircle size={9} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {playError.length > 40 ? playError.slice(0, 40) + '…' : playError}
          </span>
        </button>
      ) : (
        <span style={{
          fontSize: 9, fontWeight: 400,
          color: playing ? '#f48771' : streaming ? '#dcdcaa' : hasCode ? '#4ec9b0' : '#383840',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          {playing ? '● Playing' : streaming ? '⟳ Building…' : hasCode ? '○ Ready' : '○ Editor'}
        </span>
      )}

      {/* Right controls */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
        <button
          onClick={onToggleCode}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '0 8px', height: 22, borderRadius: 3,
            fontSize: 9,
            color: codeOpen ? '#dcdcaa' : '#383840',
            background: codeOpen ? 'rgba(220,220,170,0.07)' : 'transparent',
            border: `1px solid ${codeOpen ? 'rgba(220,220,170,0.2)' : '#252530'}`,
            cursor: 'pointer', transition: 'all 0.12s',
          }}
        >
          <FileCode size={9} />
          <span>Code</span>
        </button>

        <button
          onClick={onToggleOutput}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '0 8px', height: 22, borderRadius: 3,
            fontSize: 9,
            color: outputOpen ? '#9cdcfe' : '#383840',
            background: outputOpen ? 'rgba(156,220,254,0.07)' : 'transparent',
            border: `1px solid ${outputOpen ? 'rgba(156,220,254,0.2)' : '#252530'}`,
            cursor: 'pointer', transition: 'all 0.12s',
          }}
        >
          <TerminalSquare size={9} />
          <span>Output</span>
          <ChevronDown size={8} style={{ transform: outputOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>

        <button
          onClick={onToggleChat}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '0 8px', height: 22, borderRadius: 3,
            fontSize: 9,
            color: chatOpen ? '#c586c0' : '#383840',
            background: chatOpen ? 'rgba(197,134,192,0.07)' : 'transparent',
            border: `1px solid ${chatOpen ? 'rgba(197,134,192,0.2)' : '#252530'}`,
            cursor: 'pointer', transition: 'all 0.12s',
          }}
        >
          <MessageSquare size={9} />
          <span>Chat</span>
          <ChevronDown size={8} style={{ transform: chatOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
      </div>
    </div>
  )
}
