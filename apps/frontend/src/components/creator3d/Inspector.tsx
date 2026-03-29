import type { SceneObject, Vec3 } from '@/stores/creatorStore'

interface InspectorProps {
  object: SceneObject | null
  onUpdate: (patch: Partial<SceneObject>) => void
}

export function Inspector({ object, onUpdate }: InspectorProps) {
  if (!object) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-white/10 flex-shrink-0">
          <span className="text-[9px] font-medium text-white/30 uppercase tracking-widest">Inspector</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[9px] text-white/20 font-light">Select an object</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-white/10 flex-shrink-0">
        <span className="text-[9px] font-medium text-white/30 uppercase tracking-widest">Inspector</span>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-2 space-y-3">
        {/* Name + type */}
        <div>
          <p className="text-[9px] font-medium text-white/50 mb-0.5">{object.type}</p>
          <p className="text-xs font-light text-white/90 truncate">{object.name}</p>
        </div>

        {/* Transform */}
        <Section label="Transform">
          <Vec3Field label="Position" value={object.position} onChange={(v) => onUpdate({ position: v })} />
          <Vec3Field label="Rotation" value={object.rotation} onChange={(v) => onUpdate({ rotation: v })} />
          <Vec3Field label="Scale" value={object.scale} onChange={(v) => onUpdate({ scale: v })} />
        </Section>

        {/* Mesh */}
        {object.mesh && (
          <Section label="Mesh">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-white/40 w-16 flex-shrink-0">Geometry</span>
              <span className="text-[9px] text-white/70 font-mono">{object.mesh.geometry}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-white/40 w-16 flex-shrink-0">Color</span>
              <input
                type="color"
                value={object.mesh.color}
                onChange={(e) => onUpdate({ mesh: { ...object.mesh!, color: e.target.value } })}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-[9px] text-white/40 font-mono">{object.mesh.color}</span>
            </div>
          </Section>
        )}

        {/* Controller */}
        {object.controller && Object.keys(object.controller).length > 0 && (
          <Section label="Controller">
            {Object.entries(object.controller).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[9px] text-white/40 w-20 flex-shrink-0 truncate">{key}</span>
                <span className="text-[9px] text-white/70 font-mono truncate">{JSON.stringify(val)}</span>
              </div>
            ))}
          </Section>
        )}

        {/* Abilities */}
        {object.abilities && object.abilities.length > 0 && (
          <Section label="Abilities">
            {object.abilities.map((a) => (
              <span key={a} className="text-[9px] text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded mr-1">{a}</span>
            ))}
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[8px] font-medium text-white/25 uppercase tracking-widest mb-1">{label}</p>
      <div className="space-y-1 pl-1">{children}</div>
    </div>
  )
}

function Vec3Field({ label, value, onChange }: { label: string; value: Vec3; onChange: (v: Vec3) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-white/40 w-14 flex-shrink-0">{label}</span>
      {(['x', 'y', 'z'] as const).map((axis) => (
        <div key={axis} className="flex items-center gap-0.5 flex-1">
          <span className={`text-[8px] font-medium w-3 flex-shrink-0 ${axis === 'x' ? 'text-red-400' : axis === 'y' ? 'text-green-400' : 'text-blue-400'}`}>
            {axis.toUpperCase()}
          </span>
          <input
            type="number"
            step="0.1"
            value={Number(value[axis].toFixed(2))}
            onChange={(e) => onChange({ ...value, [axis]: parseFloat(e.target.value) || 0 })}
            className="w-full bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[9px] font-mono text-white/80 outline-none focus:border-primary/40 min-w-0"
          />
        </div>
      ))}
    </div>
  )
}
