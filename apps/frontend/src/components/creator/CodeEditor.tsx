import { useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { motion } from 'motion/react'
import { ArrowLeft, Eye, Save } from 'lucide-react'
import { useCreatorStore } from '@/stores/creatorStore'

interface CodeEditorProps {
  gameId: string
  onBack: () => void
  onPreview: () => void
}

export function CodeEditor({ gameId, onBack, onPreview }: CodeEditorProps) {
  const game = useCreatorStore((s) => s.games.find((g) => g.id === gameId))
  const updateCode = useCreatorStore((s) => s.updateCode)
  const [localCode, setLocalCode] = useState(game?.code ?? '')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    updateCode(gameId, localCode)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-light text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} />
          Back to Chat
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-light text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all"
          >
            <Save size={11} />
            {saved ? 'Saved!' : 'Save'}
          </button>
          <button
            onClick={() => {
              updateCode(gameId, localCode)
              onPreview()
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-all"
          >
            <Eye size={11} />
            Run Preview
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={localCode}
          onChange={setLocalCode}
          height="100%"
          theme={oneDark}
          extensions={[javascript({ jsx: false })]}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            autocompletion: true,
            bracketMatching: true,
            closeBrackets: true,
            indentOnInput: true,
          }}
          style={{ height: '100%', fontSize: '11px' }}
        />
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-border/20 flex-shrink-0">
        <p className="text-[9px] font-light text-muted-foreground/30 text-center">
          Edit the Game class · Save then Run Preview to test changes
        </p>
      </div>
    </motion.div>
  )
}
