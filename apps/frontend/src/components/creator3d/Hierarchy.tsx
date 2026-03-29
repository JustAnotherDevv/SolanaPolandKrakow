import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import type { Scene3D, SceneObject } from '@/stores/creatorStore'

const TYPE_META: Record<string, { icon: string; color: string; short: string }> = {
  PlayerController: { icon: '●', color: '#4ec9b0', short: 'Player' },
  NPCController:    { icon: '●', color: '#f48771', short: 'NPC' },
  StaticMesh:       { icon: '■', color: '#9cdcfe', short: 'Mesh' },
  DirectionalLight: { icon: '↘', color: '#ffe066', short: 'DirLight' },
  PointLight:       { icon: '◉', color: '#ffcc44', short: 'PtLight' },
  AmbientLight:     { icon: '☀', color: '#ffd580', short: 'Ambient' },
  HemisphereLight:  { icon: '⬡', color: '#87ceeb', short: 'Hemi' },
  SpotLight:        { icon: '⚟', color: '#ff9944', short: 'Spot' },
  Fog:              { icon: '≋', color: '#88aacc', short: 'Fog' },
  Sky:              { icon: '◌', color: '#4ec9f0', short: 'Sky' },
  PostFX:           { icon: '✦', color: '#c586c0', short: 'PostFX' },
  Item:             { icon: '◆', color: '#b5cea8', short: 'Item' },
  Trigger:          { icon: '◇', color: '#569cd6', short: 'Trigger' },
  GameController:   { icon: '⬡', color: '#c586c0', short: 'GameCtrl' },
}

const ADD_CATEGORIES = [
  {
    label: 'Gameplay',
    types: ['StaticMesh', 'PlayerController', 'NPCController', 'Item', 'Trigger', 'GameController'],
  },
  {
    label: 'Lighting',
    types: ['AmbientLight', 'HemisphereLight', 'DirectionalLight', 'PointLight', 'SpotLight'],
  },
  {
    label: 'Environment',
    types: ['Fog', 'Sky'],
  },
  {
    label: 'Post FX',
    types: ['PostFX'],
  },
]

interface HierarchyProps {
  scene?: Scene3D
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd?: (type: string) => void
  onDelete?: (id: string) => void
  onDuplicate?: (id: string) => void
}

export function Hierarchy({ scene, selectedId, onSelect, onAdd, onDelete, onDuplicate }: HierarchyProps) {
  const objects = scene?.objects ?? []
  const [addOpen, setAddOpen] = useState(false)
  const addRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!addOpen) return
    const handler = (e: MouseEvent) => {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [addOpen])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#161618', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', height: 28, borderBottom: '1px solid #222228', background: '#111116', flexShrink: 0, gap: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#555560', letterSpacing: '0.1em', textTransform: 'uppercase', flex: 1 }}>
          Outliner
        </span>
        <span style={{ fontSize: 8, color: '#333338' }}>{objects.length}</span>

        <div ref={addRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setAddOpen(v => !v)}
            title="Add object"
            style={{
              display: 'flex', alignItems: 'center', gap: 2,
              padding: '1px 6px', height: 18, borderRadius: 3,
              fontSize: 9, color: addOpen ? '#4ec9b0' : '#555560',
              background: addOpen ? 'rgba(78,201,176,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${addOpen ? 'rgba(78,201,176,0.25)' : '#2a2a32'}`,
              cursor: 'pointer',
            }}
          >
            <Plus size={8} />
            Add
          </button>

          {addOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 3, zIndex: 50,
              background: '#1a1a22', border: '1px solid #2a2a36', borderRadius: 5,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)', minWidth: 164, overflow: 'hidden',
            }}>
              {ADD_CATEGORIES.map((cat, ci) => (
                <div key={cat.label}>
                  {ci > 0 && <div style={{ height: 1, background: '#222230', margin: '2px 0' }} />}
                  <div style={{ padding: '4px 10px 2px', fontSize: 7, fontWeight: 700, color: '#444450', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {cat.label}
                  </div>
                  {cat.types.map(type => {
                    const meta = TYPE_META[type] ?? { icon: '●', color: '#888', short: type }
                    return (
                      <button
                        key={type}
                        onClick={() => { onAdd?.(type); setAddOpen(false) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '4px 10px',
                          fontSize: 10, color: '#a8a8b8', background: 'transparent', textAlign: 'left',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#22222e' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <span style={{ fontSize: 9, color: meta.color, width: 12, textAlign: 'center' }}>{meta.icon}</span>
                        <span>{type}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scene root row */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', height: 22, borderBottom: '1px solid #1c1c22', background: '#131316', flexShrink: 0 }}>
        <span style={{ fontSize: 8, color: '#2a2a36', marginRight: 4 }}>▸</span>
        <span style={{ fontSize: 9, color: '#383840' }}>Scene</span>
      </div>

      {/* Object list */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#2e2e36 transparent' }}>
        {objects.length === 0 ? (
          <div style={{ padding: '14px 12px', fontSize: 9, color: '#2a2a38', fontStyle: 'italic' }}>
            AI will populate scene here…
          </div>
        ) : (
          objects.map((obj) => (
            <HierarchyRow
              key={obj.id}
              obj={obj}
              selected={selectedId === obj.id}
              onSelect={onSelect}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          ))
        )}
      </div>
    </div>
  )
}

function HierarchyRow({
  obj, selected, onSelect, onDelete, onDuplicate,
}: {
  obj: SceneObject; selected: boolean
  onSelect: (id: string) => void
  onDelete?: (id: string) => void
  onDuplicate?: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const meta = TYPE_META[obj.type] ?? { icon: '●', color: '#888', short: obj.type }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', width: '100%',
        padding: '0 8px 0 12px', height: 24,
        background: selected ? '#16304c' : hovered ? '#1c1c28' : 'transparent',
        borderLeft: `2px solid ${selected ? '#3d9fff' : 'transparent'}`,
        transition: 'background 0.08s',
        cursor: 'default',
        userSelect: 'none',
      }}
      onClick={() => onSelect(obj.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ fontSize: 8, color: meta.color, marginRight: 6, lineHeight: 1, flexShrink: 0 }}>{meta.icon}</span>
      <span style={{ fontSize: 10, color: selected ? '#e0e0ec' : hovered ? '#c0c0cc' : '#888894', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {obj.name}
      </span>
      <span style={{ fontSize: 7, color: meta.color + '99', background: meta.color + '14', padding: '1px 5px', borderRadius: 2, flexShrink: 0, marginLeft: 3 }}>
        {meta.short}
      </span>

      {hovered && (
        <div style={{ display: 'flex', gap: 2, marginLeft: 4 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onDuplicate?.(obj.id)}
            title="Duplicate"
            style={{ width: 16, height: 16, borderRadius: 2, background: 'rgba(156,220,254,0.1)', border: '1px solid rgba(156,220,254,0.2)', cursor: 'pointer', fontSize: 8, color: '#9cdcfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >⧉</button>
          <button
            onClick={() => onDelete?.(obj.id)}
            title="Delete"
            style={{ width: 16, height: 16, borderRadius: 2, background: 'rgba(244,135,113,0.1)', border: '1px solid rgba(244,135,113,0.2)', cursor: 'pointer', fontSize: 9, color: '#f48771', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
        </div>
      )}
    </div>
  )
}
