import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useCreatorStore, generateId } from '@/stores/creatorStore'
import { useAgentStream } from '@/hooks/useAgentStream'
import { Toolbar3D } from './Toolbar3D'
import { Hierarchy } from './Hierarchy'
import { Inspector } from './Inspector'
import { Viewport3D } from './Viewport3D'
import { TemplateSelector3D } from './TemplateSelector3D'
import { CodeFiles3D } from './CodeFiles3D'
import { CreatorChat } from '@/components/creator/CreatorChat'
import type { SceneObject } from '@/stores/creatorStore'
import type { AgentStepItem, GeneratedAsset } from '@/hooks/useAgentStream'
import type { GameTemplate3D } from './TemplateSelector3D'

type TransformMode = 'translate' | 'rotate' | 'scale'
type SidebarTab = 'output' | 'chat'

interface Editor3DProps {
  gameId: string
}

// Compact output log for sidebar
function OutputLog({ steps, assets, streaming }: { steps: AgentStepItem[]; assets: GeneratedAsset[]; streaming: boolean }) {
  if (steps.length === 0 && !streaming) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 9, color: '#2a2a38' }}>No output yet</span>
      </div>
    )
  }
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {streaming && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderBottom: '1px solid #1c1c22', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                style={{ width: 4, height: 4, borderRadius: '50%', background: '#9945FF', display: 'block' }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
          <span style={{ fontSize: 9, color: '#666670' }}>Building scene…</span>
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 0', scrollbarWidth: 'thin', scrollbarColor: '#2a2a32 transparent' }}>
        {steps.slice().reverse().map(step => (
          <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '2px 10px', minHeight: 20 }}>
            <span style={{ fontSize: 10, flexShrink: 0, marginTop: 1, color: '#3a3a44' }}>{step.icon ?? '·'}</span>
            <span style={{ fontSize: 9, color: step.done ? '#333340' : '#6a6a78', flex: 1, lineHeight: '16px' }}>
              {step.message}
            </span>
          </div>
        ))}
      </div>
      {assets.length > 0 && (
        <div style={{ display: 'flex', gap: 5, padding: '5px 10px', borderTop: '1px solid #1c1c22', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
          {assets.map(asset => (
            <div key={asset.assetId} style={{ flexShrink: 0, textAlign: 'center' }}>
              <img src={asset.url} alt={asset.name} title={asset.name} style={{ width: 28, height: 28, borderRadius: 3, objectFit: 'cover', border: '1px solid #2a2a32', display: 'block' }} />
              <span style={{ fontSize: 7, color: '#333340', display: 'block', maxWidth: 28, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{asset.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const TYPE_DEFAULTS: Record<string, Partial<SceneObject>> = {
  StaticMesh:       { mesh: { geometry: 'box',     color: '#888888' } },
  PlayerController: { mesh: { geometry: 'capsule', color: '#4ec9b0' } },
  NPCController:    { mesh: { geometry: 'capsule', color: '#f48771' } },
  DirectionalLight: { controller: { color: '#ffffff', intensity: 1 } },
  PointLight:       { controller: { color: '#ffffff', intensity: 1, distance: 40 } },
  Trigger:          { scale: { x: 2, y: 2, z: 2 } },
  GameController:   {},
  Item:             { mesh: { geometry: 'sphere',  color: '#b5cea8' } },
}

export function Editor3D({ gameId }: Editor3DProps) {
  const game               = useCreatorStore((s) => s.games.find((g) => g.id === gameId))
  const updateSceneObject  = useCreatorStore((s) => s.updateSceneObject)
  const addSceneObject     = useCreatorStore((s) => s.addSceneObject)
  const removeSceneObject  = useCreatorStore((s) => s.removeSceneObject)
  const duplicateSceneObject = useCreatorStore((s) => s.duplicateSceneObject)
  const agentStream        = useAgentStream(gameId)

  const [playing, setPlaying]             = useState(false)
  const [selectedId, setSelectedId]       = useState<string | null>(null)
  const [transformMode, setTransformMode] = useState<TransformMode>('translate')
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [sidebarTab, setSidebarTab]       = useState<SidebarTab>('chat')
  const [codeOpen, setCodeOpen]           = useState(false)
  const [playError, setPlayError]         = useState<string | null>(null)

  const selectedObject = game?.scene?.objects.find((o) => o.id === selectedId) ?? null
  const hasCode    = !!(game?.code)
  const hasContent = hasCode || !!(game?.scene?.objects.length)

  // W/E/R keyboard shortcuts for transform mode
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (e.key === 'w' || e.key === 'W') setTransformMode('translate')
    if (e.key === 'e' || e.key === 'E') setTransformMode('rotate')
    if (e.key === 'r' || e.key === 'R') setTransformMode('scale')
    if (e.key === 'Escape') { setSelectedId(null); setCodeOpen(false) }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !e.target) handleDelete()
  }, [selectedId])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  function handleUpdate(patch: Partial<SceneObject>) {
    if (!selectedId) return
    updateSceneObject(gameId, selectedId, patch)
  }

  function handleNameChange(name: string) {
    if (!selectedId) return
    updateSceneObject(gameId, selectedId, { name })
  }

  function handleDelete(id?: string) {
    const target = id ?? selectedId
    if (!target) return
    removeSceneObject(gameId, target)
    if (target === selectedId) setSelectedId(null)
  }

  function handleDuplicate(id?: string) {
    const target = id ?? selectedId
    if (!target) return
    const newId = duplicateSceneObject(gameId, target)
    setSelectedId(newId)
  }

  function handleAdd(type: string) {
    const defaults = TYPE_DEFAULTS[type] ?? {}
    const obj: SceneObject = {
      id: generateId(),
      name: type,
      type,
      position: { x: 0, y: 1, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale:    { x: 1, y: 1, z: 1 },
      ...defaults,
    }
    addSceneObject(gameId, obj)
    setSelectedId(obj.id)
  }

  function handleTransformChange(id: string, patch: Partial<SceneObject>) {
    updateSceneObject(gameId, id, patch)
  }

  function handlePlay() {
    if (!hasCode) return
    setPlayError(null)
    setCodeOpen(false)
    setPlaying(true)
  }

  function handleStop() { setPlaying(false) }

  function handlePlayError(err: string) {
    setPlayError(err)
    setPlaying(false)
    setSidebarOpen(true)
    setSidebarTab('output')
  }

  function handleTemplateSelect(template: GameTemplate3D) {
    setSidebarOpen(true)
    setSidebarTab('chat')
    agentStream.send(template.prompt)
  }

  function handleCustom() {
    setSidebarOpen(true)
    setSidebarTab('chat')
  }

  function handleToggleOutput() {
    if (!sidebarOpen || sidebarTab !== 'output') { setSidebarOpen(true); setSidebarTab('output') }
    else setSidebarOpen(false)
  }

  function handleToggleChat() {
    if (!sidebarOpen || sidebarTab !== 'chat') { setSidebarOpen(true); setSidebarTab('chat') }
    else setSidebarOpen(false)
  }

  const showTemplates = !hasContent && !agentStream.streaming

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a10', overflow: 'hidden' }}>

      {/* Toolbar */}
      <Toolbar3D
        playing={playing}
        streaming={agentStream.streaming}
        hasCode={hasCode}
        onPlay={handlePlay}
        onStop={handleStop}
        onToggleChat={handleToggleChat}
        chatOpen={sidebarOpen && sidebarTab === 'chat'}
        playError={playError}
        onClearError={() => setPlayError(null)}
        outputOpen={sidebarOpen && sidebarTab === 'output'}
        onToggleOutput={handleToggleOutput}
        transformMode={transformMode}
        onTransformMode={setTransformMode}
        codeOpen={codeOpen}
        onToggleCode={() => setCodeOpen(v => !v)}
      />

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left: Hierarchy */}
        <div style={{ width: 168, flexShrink: 0, borderRight: '1px solid #1e1e28' }}>
          <Hierarchy
            scene={game?.scene}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onDuplicate={(id) => handleDuplicate(id)}
          />
        </div>

        {/* Center: Viewport */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minWidth: 0 }}>
          <Viewport3D
            scene={game?.scene}
            code={game?.code}
            playing={playing}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onPlayError={handlePlayError}
            onStop={handleStop}
            transformMode={transformMode}
            onTransformChange={handleTransformChange}
          />

          {/* Template selector overlay */}
          <AnimatePresence>
            {showTemplates && (
              <TemplateSelector3D onSelect={handleTemplateSelect} onCustom={handleCustom} />
            )}
          </AnimatePresence>

          {/* Code view overlay */}
          <AnimatePresence>
            {codeOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                style={{ position: 'absolute', inset: 0, zIndex: 15 }}
              >
                <CodeFiles3D
                  code={game?.code ?? ''}
                  onClose={() => setCodeOpen(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Inspector (always visible) */}
        <div style={{ width: 216, flexShrink: 0, borderLeft: '1px solid #1e1e28', overflow: 'hidden' }}>
          <Inspector
            object={selectedObject}
            onUpdate={handleUpdate}
            onDelete={() => handleDelete()}
            onDuplicate={() => handleDuplicate()}
            onNameChange={handleNameChange}
          />
        </div>

        {/* Far right: Chat / Output panel (full-height, slides in) */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 288 }}
              exit={{ width: 0 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              style={{
                flexShrink: 0, overflow: 'hidden',
                borderLeft: '1px solid #1e1e28',
                display: 'flex', flexDirection: 'column',
                background: '#0e0e14',
              }}
            >
              {/* Tab bar */}
              <div style={{ display: 'flex', alignItems: 'center', height: 28, borderBottom: '1px solid #1e1e28', background: '#111116', flexShrink: 0 }}>
                {(['output', 'chat'] as const).map(tab => {
                  const active = sidebarTab === tab
                  const color = tab === 'chat' ? '#c586c0' : '#9cdcfe'
                  return (
                    <button
                      key={tab}
                      onClick={() => setSidebarTab(tab)}
                      style={{
                        padding: '0 12px', height: '100%', fontSize: 8, fontWeight: 700,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: active ? color : '#383840',
                        background: 'transparent',
                        borderRight: '1px solid #1c1c22',
                        borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
                        cursor: 'pointer',
                      }}
                    >
                      {tab === 'output' ? 'Output' : 'Chat'}
                    </button>
                  )
                })}
                {agentStream.streaming && (
                  <div style={{ display: 'flex', gap: 2, marginLeft: 8, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <motion.span key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: '#9945FF', display: 'block' }}
                        animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setSidebarOpen(false)}
                  style={{ marginLeft: 'auto', padding: '0 8px', height: '100%', fontSize: 11, color: '#333340', cursor: 'pointer' }}
                >✕</button>
              </div>

              {/* Panel content — full remaining height */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {sidebarTab === 'output' && (
                  <OutputLog steps={agentStream.steps} assets={agentStream.assets} streaming={agentStream.streaming} />
                )}
                {sidebarTab === 'chat' && (
                  <CreatorChat gameId={gameId} onPreview={() => {}} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
