import { useState, useRef } from 'react'
import { Copy, Check, Trash2, Copy as CopyIcon } from 'lucide-react'
import type { SceneObject, Vec3 } from '@/stores/creatorStore'

const C = {
  bg:           '#161618',
  headerBg:     '#111116',
  sectionBg:    '#131316',
  border:       '#222228',
  borderLight:  '#1c1c22',
  text:         '#c8c8d4',
  label:        '#7a7a88',
  muted:        '#44444e',
  accent:       '#3d9fff',
  inputBg:      '#0e0e14',
  inputBorder:  '#2e2e3a',
  selectBg:     '#0e0e14',
}

const GEOMS = ['box', 'sphere', 'capsule', 'cylinder', 'plane']

interface InspectorProps {
  object: SceneObject | null
  onUpdate: (patch: Partial<SceneObject>) => void
  onDelete?: () => void
  onDuplicate?: () => void
  onNameChange?: (name: string) => void
}

export function Inspector({ object, onUpdate, onDelete, onDuplicate, onNameChange }: InspectorProps) {
  const [copied, setCopied] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  function copyId(id: string) {
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      {/* Panel header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', height: 28, borderBottom: `1px solid ${C.border}`, background: C.headerBg, flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#555560', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Details</span>
      </div>

      {!object ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: C.muted }}>Select an object</span>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#3a3a42 transparent' }}>

          {/* Object identity */}
          <div style={{ padding: '8px 10px 6px', borderBottom: `1px solid ${C.borderLight}`, background: C.headerBg }}>
            {/* Editable name */}
            <input
              ref={nameInputRef}
              defaultValue={object.name}
              key={object.id + '-name'}
              onBlur={e => onNameChange?.(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                fontSize: 12, fontWeight: 600, color: C.text,
                padding: 0, marginBottom: 3,
                fontFamily: 'system-ui, sans-serif',
              }}
            />

            {/* Type + ID row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <TypeBadge type={object.type} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 8, color: C.muted, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  #{object.id}
                </span>
                <button
                  onClick={() => copyId(object.id)}
                  title="Copy ID"
                  style={{ flexShrink: 0, padding: '1px 4px', borderRadius: 2, background: copied ? '#4ec9b018' : '#1e1e28', border: `1px solid ${copied ? '#4ec9b040' : C.inputBorder}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  {copied ? <Check size={8} style={{ color: '#4ec9b0' }} /> : <Copy size={8} style={{ color: C.muted }} />}
                  <span style={{ fontSize: 7, color: copied ? '#4ec9b0' : C.muted }}>{copied ? 'Copied' : 'Copy ID'}</span>
                </button>
              </div>
            </div>

            {/* Action bar */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={onDuplicate}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 22, borderRadius: 3, fontSize: 9, color: '#9cdcfe', background: 'rgba(156,220,254,0.06)', border: '1px solid rgba(156,220,254,0.15)', cursor: 'pointer' }}
              >
                <CopyIcon size={9} />
                Duplicate
              </button>
              <button
                onClick={onDelete}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 22, borderRadius: 3, fontSize: 9, color: '#f48771', background: 'rgba(244,135,113,0.06)', border: '1px solid rgba(244,135,113,0.15)', cursor: 'pointer' }}
              >
                <Trash2 size={9} />
                Delete
              </button>
            </div>
          </div>

          {/* Transform */}
          <Section label="Transform">
            <Vec3Row label="Position" value={object.position} onChange={v => onUpdate({ position: v })} />
            <Vec3Row label="Rotation" value={object.rotation} onChange={v => onUpdate({ rotation: v })} />
            <Vec3Row label="Scale"    value={object.scale}    onChange={v => onUpdate({ scale: v })} />
          </Section>

          {/* Mesh */}
          {object.mesh && (
            <Section label="Mesh">
              <PropRow label="Geometry">
                <select
                  value={object.mesh.geometry}
                  onChange={e => onUpdate({ mesh: { ...object.mesh!, geometry: e.target.value } })}
                  style={{ width: '100%', background: C.selectBg, border: `1px solid ${C.inputBorder}`, borderRadius: 3, fontSize: 10, color: C.text, padding: '2px 4px', outline: 'none', cursor: 'pointer' }}
                >
                  {GEOMS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </PropRow>
              <PropRow label="Color">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="color"
                    value={object.mesh.color}
                    onChange={e => onUpdate({ mesh: { ...object.mesh!, color: e.target.value } })}
                    style={{ width: 22, height: 22, border: `1px solid ${C.inputBorder}`, borderRadius: 3, cursor: 'pointer', background: 'none', padding: 0 }}
                  />
                  <span style={{ fontSize: 9, color: '#666674', fontFamily: 'monospace' }}>{object.mesh.color}</span>
                </div>
              </PropRow>
            </Section>
          )}

          {/* Controller */}
          {object.controller && Object.keys(object.controller).length > 0 && (
            <Section label="Controller">
              {Object.entries(object.controller).map(([k, v]) => (
                <PropRow key={k} label={k}>
                  <input
                    defaultValue={typeof v === 'string' ? v : JSON.stringify(v)}
                    key={object.id + '-ctrl-' + k}
                    onBlur={e => {
                      const raw = e.target.value
                      const parsed = isNaN(Number(raw)) ? raw : Number(raw)
                      onUpdate({ controller: { ...object.controller, [k]: parsed } })
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    style={{
                      width: '100%', background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 3,
                      fontSize: 10, color: C.text, padding: '2px 5px', outline: 'none', fontFamily: 'monospace',
                    }}
                  />
                </PropRow>
              ))}
            </Section>
          )}

          {/* Abilities */}
          {object.abilities && object.abilities.length > 0 && (
            <Section label="Abilities">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '3px 0' }}>
                {object.abilities.map(a => (
                  <span key={a} style={{ fontSize: 9, color: '#4ec9b0', background: '#4ec9b018', padding: '2px 7px', borderRadius: 3, border: '1px solid #4ec9b030' }}>
                    {a}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

// ── Type badge ─────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  PlayerController: '#4ec9b0',
  NPCController:    '#f48771',
  StaticMesh:       '#9cdcfe',
  DirectionalLight: '#dcdcaa',
  PointLight:       '#dcdcaa',
  Item:             '#b5cea8',
  Trigger:          '#569cd6',
  GameController:   '#c586c0',
}
function TypeBadge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] ?? '#888894'
  return (
    <span style={{ fontSize: 8, color, background: color + '18', padding: '1px 6px', borderRadius: 2, border: `1px solid ${color}30`, flexShrink: 0, fontWeight: 600, letterSpacing: '0.04em' }}>
      {type}
    </span>
  )
}

// ── Section ────────────────────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: `1px solid ${C.borderLight}` }}>
      <div style={{ padding: '4px 10px 3px', background: C.sectionBg, display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 8, fontWeight: 700, color: '#505058', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ padding: '3px 0 4px' }}>{children}</div>
    </div>
  )
}

// ── PropRow ────────────────────────────────────────────────────────────────────
function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '2px 10px', minHeight: 22 }}>
      <span style={{ fontSize: 9, color: C.label, width: '38%', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

// ── Vec3Row ────────────────────────────────────────────────────────────────────
function Vec3Row({ label, value, onChange }: { label: string; value: Vec3; onChange: (v: Vec3) => void }) {
  return (
    <div style={{ padding: '2px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 8, color: C.muted, letterSpacing: '0.04em' }}>{label}</span>
      <div style={{ display: 'flex', gap: 3 }}>
        {(['x', 'y', 'z'] as const).map(axis => (
          <div key={axis} style={{ flex: 1, display: 'flex', alignItems: 'center', background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 3, overflow: 'hidden' }}>
            <span style={{ fontSize: 7, fontWeight: 700, padding: '0 3px', color: axis === 'x' ? '#f48771' : axis === 'y' ? '#4ec9b0' : '#569cd6', flexShrink: 0, lineHeight: 1 }}>
              {axis.toUpperCase()}
            </span>
            <input
              type="number"
              step={0.1}
              value={parseFloat(value[axis].toFixed(3))}
              onChange={e => onChange({ ...value, [axis]: parseFloat(e.target.value) || 0 })}
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                fontSize: 9, color: C.text, padding: '2px 2px 2px 0', fontFamily: 'monospace',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
