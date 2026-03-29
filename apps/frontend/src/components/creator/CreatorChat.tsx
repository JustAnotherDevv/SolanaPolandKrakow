import { useRef, useEffect, useState, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Send, Square, Copy, Check } from 'lucide-react'
import { useCreatorStore } from '@/stores/creatorStore'
import type { StoredMessage } from '@/stores/creatorStore'
import { useGameGenerator } from '@/hooks/useGameGenerator'
import { useAgentStream } from '@/hooks/useAgentStream'
import { AgentProgress } from './AgentProgress'
import { VersionBadge } from './VersionBadge'
import { cn } from '@/lib/utils'

interface ExternalAgentStream {
  send: (msg: string) => void
  abort: () => void
  streaming: boolean
  steps: import('@/hooks/useAgentStream').AgentStepItem[]
  assets: import('@/hooks/useAgentStream').GeneratedAsset[]
  streamedCode: string
  backendAvailable: boolean
}

interface CreatorChatProps {
  gameId: string
  onPreview: (code?: string) => void
  autoSend?: string | null
  onAutoSendConsumed?: () => void
  /** When provided, CreatorChat uses this instead of creating its own useAgentStream */
  externalAgent?: ExternalAgentStream
}

// ─── Code block with copy button ──────────────────────────────────────────────

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-white/10">
      <div className="px-3 py-1.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
        <span className="text-[9px] font-light text-white/30 uppercase tracking-wider">javascript</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[9px] font-light text-white/40 hover:text-white/70 transition-colors"
        >
          {copied ? <Check size={9} className="text-[#14F195]" /> : <Copy size={9} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 text-[10px] font-mono text-green-300/70 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all max-h-52">
        {code}
      </pre>
    </div>
  )
}

// ─── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  gameId,
  isStreaming,
  onPreview,
}: {
  msg: StoredMessage
  gameId: string
  isStreaming?: boolean
  onPreview: (code: string) => void
}) {
  const game = useCreatorStore((s) => s.games.find((g) => g.id === gameId))
  const currentVersionId = game?.currentVersionId
  const version = game?.versions.find((v) => v.id === msg.versionId)

  function renderAssistantContent(content: string) {
    const parts = content.split(/(```(?:javascript|js)[\s\S]*?```)/g)
    return parts.map((part, i) => {
      const codeMatch = part.match(/```(?:javascript|js)\s*([\s\S]*?)```/)
      if (codeMatch) return <CodeBlock key={i} code={codeMatch[1].trim()} />
      return part ? (
        <p key={i} className={cn(
          'text-xs font-light leading-relaxed whitespace-pre-wrap',
          msg.isError ? 'text-red-400/80' : 'text-white/75',
        )}>
          {part}
        </p>
      ) : null
    })
  }

  const timestamp = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end group">
        <div className="max-w-[82%]">
          <div className="px-3 py-2 rounded-2xl rounded-tr-sm bg-primary/15 border border-primary/20">
            <p className="text-xs font-light text-white/90 leading-relaxed">{msg.content}</p>
          </div>
          <p className="text-[8px] font-light text-muted-foreground/30 text-right mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {timestamp}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start group">
      <div className="max-w-[94%] space-y-0.5">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary/60 to-[#14F195]/40 flex-shrink-0" />
          <span className="text-[9px] font-light text-white/25 uppercase tracking-widest">AI</span>
          {isStreaming && (
            <span className="flex gap-0.5 ml-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1 h-1 rounded-full bg-primary/60"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </span>
          )}
          <p className="text-[8px] font-light text-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity">
            {timestamp}
          </p>
        </div>
        <div className="pl-5 space-y-1.5">
          {renderAssistantContent(msg.content)}
          {/* Version badge below code if this message introduced a version */}
          {version && (
            <VersionBadge
              version={version}
              gameId={gameId}
              isActive={version.id === currentVersionId}
              onPreview={onPreview}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Starter prompts ───────────────────────────────────────────────────────────

const STARTER_PROMPTS = [
  'Make a Flappy Bird clone',
  'Build a Snake game',
  'Create a simple Pong game',
  'Make an asteroid shooter',
  'Build a brick breaker game',
  'Create a platformer with jumps and enemies',
]

// ─── Main component ───────────────────────────────────────────────────────────

export function CreatorChat({ gameId, onPreview, autoSend, onAutoSendConsumed, externalAgent }: CreatorChatProps) {
  const game = useCreatorStore((s) => s.games.find((g) => g.id === gameId))
  const updateName = useCreatorStore((s) => s.updateName)
  const internalAgentStream = useAgentStream(gameId)
  const directGen = useGameGenerator(gameId)
  // If an external agent stream is provided (3D editor), use it exclusively.
  // Otherwise fall back to internal hook → backend → direct OpenRouter.
  const agentStream = externalAgent ?? internalAgentStream
  const useBackend = agentStream.backendAvailable
  const send = useBackend ? agentStream.send : directGen.send
  const abort = useBackend ? agentStream.abort : directGen.abort
  const streaming = useBackend ? agentStream.streaming : directGen.streaming
  const steps = useBackend ? agentStream.steps : ([] as typeof internalAgentStream.steps)
  const assets = useBackend ? agentStream.assets : ([] as typeof internalAgentStream.assets)
  const streamedText = useBackend ? agentStream.streamedCode : directGen.streamedText
  const [input, setInput] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const messages = game?.chatHistory ?? []
  const versionCount = game?.versions.length ?? 0

  useEffect(() => {
    if (autoSend && !streaming) {
      send(autoSend)
      onAutoSendConsumed?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamedText])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || streaming) return
    setInput('')
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    send(trimmed)
  }

  function handleNameSave() {
    if (nameInput.trim()) updateName(gameId, nameInput.trim())
    setEditingName(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
              className="bg-transparent text-sm font-light text-foreground outline-none border-b border-primary/50 pb-0.5 max-w-[180px]"
            />
          ) : (
            <button
              onClick={() => { setNameInput(game?.name ?? ''); setEditingName(true) }}
              className="text-sm font-light text-foreground hover:text-primary transition-colors truncate max-w-[180px]"
              title="Click to rename"
            >
              {game?.name ?? 'Untitled Game'}
            </button>
          )}
          {versionCount > 0 && (
            <span className="text-[9px] font-light text-muted-foreground/40 flex-shrink-0">
              {game?.versions.find((v) => v.id === game.currentVersionId)?.label ?? ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[9px] font-light text-muted-foreground/40 flex-shrink-0">
          {messages.length > 0 && (
            <span>{messages.length} msg{messages.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Agent progress (backend mode) */}
      <AnimatePresence>
        {(steps.length > 0 || (streaming && agentStream.backendAvailable)) && (
          <AgentProgress steps={steps} assets={assets} streaming={streaming} />
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-5">
        {messages.length === 0 && !streaming ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full gap-5 pb-8"
          >
            <div className="text-center space-y-1.5">
              <p className="text-sm font-light text-foreground/60">Describe your game</p>
              <p className="text-xs font-light text-muted-foreground/40">
                AI generates a playable Canvas game — then keep chatting to improve it
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); textareaRef.current?.focus() }}
                  className="text-left px-3 py-2 rounded-xl border border-border/25 text-[10px] font-light text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all leading-relaxed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <MessageBubble
                    msg={msg}
                    gameId={gameId}
                    onPreview={onPreview}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Live streaming bubble */}
            {streaming && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                {streamedText ? (
                  <MessageBubble
                    msg={{
                      id: '__streaming__',
                      role: 'assistant',
                      content: streamedText,
                      timestamp: Date.now(),
                    }}
                    gameId={gameId}
                    isStreaming
                    onPreview={onPreview}
                  />
                ) : (
                  <div className="flex items-center gap-2 pl-1">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary/60 to-[#14F195]/40" />
                    <span className="flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-primary/60"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0 border-t border-border/20">
        <div
          className={cn(
            'flex items-end gap-2 rounded-2xl border px-3 py-2 transition-all',
            streaming
              ? 'border-primary/30 bg-primary/5'
              : 'border-border/35 bg-muted/8 focus-within:border-primary/35 focus-within:bg-muted/15',
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              streaming
                ? 'Generating…'
                : messages.length === 0
                ? 'Describe your game idea…'
                : 'Suggest a change, add a feature, fix a bug…'
            }
            rows={1}
            disabled={streaming}
            className="flex-1 bg-transparent text-xs font-light text-foreground placeholder:text-muted-foreground/35 outline-none resize-none max-h-28 overflow-y-auto leading-relaxed disabled:opacity-40"
            style={{ minHeight: '20px' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 112) + 'px'
            }}
          />
          {streaming ? (
            <button
              onClick={abort}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-red-500/80 flex items-center justify-center hover:bg-red-500 transition-all mb-0.5"
              title="Stop generation"
            >
              <Square size={10} className="text-white fill-white" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={cn(
                'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all mb-0.5',
                input.trim()
                  ? 'bg-primary text-black hover:bg-primary/80'
                  : 'bg-muted/20 text-muted-foreground/30',
              )}
            >
              <Send size={12} />
            </button>
          )}
        </div>
        <p className="text-[8px] font-light text-muted-foreground/25 text-center mt-1.5">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  )
}
