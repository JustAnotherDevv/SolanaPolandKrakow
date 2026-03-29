import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useCreatorStore } from '@/stores/creatorStore'
import { useAgentStream } from '@/hooks/useAgentStream'
import { Toolbar3D } from './Toolbar3D'
import { Hierarchy } from './Hierarchy'
import { Inspector } from './Inspector'
import { Viewport3D } from './Viewport3D'
import { AgentProgress } from '@/components/creator/AgentProgress'
import { CreatorChat } from '@/components/creator/CreatorChat'
import type { SceneObject } from '@/stores/creatorStore'

interface Editor3DProps {
  gameId: string
}

export function Editor3D({ gameId }: Editor3DProps) {
  const game = useCreatorStore((s) => s.games.find((g) => g.id === gameId))
  const updateSceneObject = useCreatorStore((s) => s.updateSceneObject)
  const agentStream = useAgentStream(gameId)

  const [playing, setPlaying] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(true)

  const selectedObject = game?.scene?.objects.find((o) => o.id === selectedId) ?? null

  function handleUpdate(patch: Partial<SceneObject>) {
    if (!selectedId) return
    updateSceneObject(gameId, selectedId, patch)
  }

  function handlePlay() {
    if (!game?.code) return
    setPlaying(true)
  }

  function handleStop() {
    setPlaying(false)
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a12]">
      {/* Toolbar */}
      <Toolbar3D
        playing={playing}
        streaming={agentStream.streaming}
        onPlay={handlePlay}
        onStop={handleStop}
        onToggleChat={() => setChatOpen((v) => !v)}
        chatOpen={chatOpen}
      />

      {/* Agent progress bar */}
      <AnimatePresence>
        {(agentStream.steps.length > 0 || agentStream.streaming) && (
          <AgentProgress
            steps={agentStream.steps}
            assets={agentStream.assets}
            streaming={agentStream.streaming}
          />
        )}
      </AnimatePresence>

      {/* Main editor area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Hierarchy panel */}
        <div className="w-44 flex-shrink-0 border-r border-white/8 bg-black/20 overflow-hidden">
          <Hierarchy
            scene={game?.scene}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Viewport */}
        <div className="flex-1 overflow-hidden relative">
          <Viewport3D
            scene={game?.scene}
            code={game?.code}
            playing={playing}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {/* Overlay: no code yet, show play disabled hint */}
          {!game?.code && !playing && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
              <span className="text-[9px] font-light text-white/20 bg-black/40 px-2 py-1 rounded">
                Press Play after AI generates the code
              </span>
            </div>
          )}
        </div>

        {/* Right column: Inspector + Chat */}
        <div className="w-52 flex-shrink-0 border-l border-white/8 bg-black/20 flex flex-col overflow-hidden">
          {/* Inspector top */}
          <div className="flex-1 overflow-hidden border-b border-white/8">
            <Inspector object={selectedObject} onUpdate={handleUpdate} />
          </div>

          {/* Chat panel (collapsible) */}
          <AnimatePresence>
            {chatOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 280, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0 overflow-hidden"
              >
                <CreatorChat
                  gameId={gameId}
                  onPreview={() => {}}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
