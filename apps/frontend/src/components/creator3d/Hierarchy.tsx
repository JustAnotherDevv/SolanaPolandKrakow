import type { Scene3D, SceneObject } from '@/stores/creatorStore'

const TYPE_ICONS: Record<string, string> = {
  PlayerController: '🧍',
  NPCController: '🤖',
  StaticMesh: '⬛',
  DirectionalLight: '☀️',
  PointLight: '💡',
  Item: '💎',
  Trigger: '🔲',
  GameController: '⚙️',
}

interface HierarchyProps {
  scene?: Scene3D
  selectedId: string | null
  onSelect: (id: string) => void
}

export function Hierarchy({ scene, selectedId, onSelect }: HierarchyProps) {
  const objects = scene?.objects ?? []

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-white/10 flex-shrink-0">
        <span className="text-[9px] font-medium text-white/30 uppercase tracking-widest">Hierarchy</span>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-1">
        {/* Scene root */}
        <div className="flex items-center gap-1.5 px-3 py-1">
          <span className="text-[9px] text-white/20">▶</span>
          <span className="text-[10px] font-light text-white/40">Scene</span>
        </div>

        {objects.length === 0 ? (
          <div className="px-5 py-2 text-[9px] text-white/20 font-light italic">
            AI will place objects here…
          </div>
        ) : (
          objects.map((obj) => (
            <HierarchyRow
              key={obj.id}
              obj={obj}
              selected={selectedId === obj.id}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}

function HierarchyRow({
  obj,
  selected,
  onSelect,
}: {
  obj: SceneObject
  selected: boolean
  onSelect: (id: string) => void
}) {
  const icon = TYPE_ICONS[obj.type] ?? '📦'
  return (
    <button
      onClick={() => onSelect(obj.id)}
      className={`w-full text-left flex items-center gap-2 px-5 py-1 text-[10px] font-light transition-colors ${
        selected
          ? 'bg-primary/15 text-primary'
          : 'text-white/55 hover:bg-white/5 hover:text-white/80'
      }`}
    >
      <span className="text-[11px] leading-none flex-shrink-0">{icon}</span>
      <span className="truncate">{obj.name}</span>
      <span className="ml-auto text-[8px] text-white/20 flex-shrink-0">{obj.type.replace('Controller', '')}</span>
    </button>
  )
}
