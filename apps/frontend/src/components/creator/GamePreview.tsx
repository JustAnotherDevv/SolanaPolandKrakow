import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, AlertCircle, Wrench } from 'lucide-react'
import { runGameCode, type GameInstance } from '@/lib/gameRunner'

interface GamePreviewProps {
  code: string
  codeOverride?: string
  versionLabel?: string
  onClose: () => void
  onFixError?: (error: string, code: string) => void
}

export function GamePreview({ code, codeOverride, versionLabel, onClose, onFixError }: GamePreviewProps) {
  const runCode = codeOverride ?? code
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<GameInstance | null>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [runError, setRunError] = useState<string | null>(null)

  useEffect(() => {
    if (!runCode) return

    if (instanceRef.current) {
      try { instanceRef.current.destroy() } catch {}
      instanceRef.current = null
    }

    setScore(0)
    setGameOver(false)
    setRunError(null)

    let cancelled = false
    let raf1 = 0
    let raf2 = 0

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled) return
        const canvas = canvasRef.current
        if (!canvas) return

        canvas.width = window.innerWidth
        canvas.height = window.innerHeight - 44 - 56 - 52

        const mockSdk = {
          updateScore: (s: number) => setScore(s),
          endGame: (s: number) => { setFinalScore(s); setGameOver(true) },
          updateLives: () => {},
          achievement: () => {},
        }

        const { instance, error } = runGameCode(canvas, mockSdk, runCode)
        if (error) setRunError(error)
        else instanceRef.current = instance
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      if (instanceRef.current) {
        try { instanceRef.current.destroy() } catch {}
        instanceRef.current = null
      }
    }
  }, [runCode])

  function handleRestart() {
    const canvas = canvasRef.current
    if (!canvas || !runCode) return
    if (instanceRef.current) {
      try { instanceRef.current.destroy() } catch {}
      instanceRef.current = null
    }
    setScore(0)
    setGameOver(false)
    setRunError(null)
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight - 44 - 56 - 52
    const mockSdk = {
      updateScore: (s: number) => setScore(s),
      endGame: (s: number) => { setFinalScore(s); setGameOver(true) },
      updateLives: () => {},
      achievement: () => {},
    }
    const { instance, error } = runGameCode(canvas, mockSdk, runCode)
    if (error) setRunError(error)
    else instanceRef.current = instance
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 35 }}
      className="fixed inset-x-0 top-11 bottom-14 z-40 bg-black flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-xs font-light text-white/40 uppercase tracking-widest">Preview</span>
          {versionLabel && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-[10px] font-light text-primary/70">{versionLabel}</span>
            </>
          )}
          <span className="text-white/20">·</span>
          <span className="text-xs font-light text-primary">
            {gameOver ? `Final: ${finalScore}` : `Score: ${score}`}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X size={14} className="text-white" />
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative">
        {runError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle size={22} className="text-red-400" />
            </div>
            <div className="text-center space-y-1 max-w-sm">
              <p className="text-sm font-medium text-red-400">Runtime Error</p>
              <p className="text-xs font-mono text-white/50 break-all bg-white/5 rounded-lg px-3 py-2 max-h-24 overflow-y-auto">{runError}</p>
            </div>
            {onFixError ? (
              <button
                onClick={() => { onFixError(runError!, runCode); onClose() }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/25 transition-all"
              >
                <Wrench size={12} />
                Fix with AI
              </button>
            ) : (
              <p className="text-xs text-white/30 font-light">Edit the code manually to fix the error</p>
            )}
          </div>
        ) : (
          <canvas ref={canvasRef} className="w-full h-full block" style={{ touchAction: 'none' }} />
        )}

        <AnimatePresence>
          {gameOver && !runError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/70 backdrop-blur-sm"
            >
              <div className="text-center space-y-1">
                <p className="text-xs font-light text-white/50 uppercase tracking-widest">Game Over</p>
                <p className="text-4xl font-light text-white">{finalScore}</p>
                <p className="text-xs font-light text-white/40">final score</p>
              </div>
              <button
                onClick={handleRestart}
                className="px-5 py-2 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-medium hover:bg-primary/30 transition-colors"
              >
                Play Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
