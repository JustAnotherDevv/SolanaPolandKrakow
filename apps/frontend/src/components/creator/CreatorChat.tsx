import { useRef, useEffect, useState, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Send, Code2, Eye } from 'lucide-react'
import { useCreatorStore } from '@/stores/creatorStore'
import { useGameGenerator } from '@/hooks/useGameGenerator'
import type { ChatMessage } from '@/lib/openrouter'
import { cn } from '@/lib/utils'

interface CreatorChatProps {
  gameId: string
  onEditCode: () => void
  onPreview: () => void
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-white/10">
      <div className="px-3 py-1.5 bg-white/5 border-b border-white/10 flex items-center gap-1.5">
        <Code2 size={11} className="text-primary/70" />
        <span className="text-[10px] font-light text-white/40 uppercase tracking-wider">javascript</span>
      </div>
      <pre className="p-3 text-[10px] font-mono text-green-300/80 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all max-h-48">
        {code}
      </pre>
    </div>
  )
}

function MessageBubble({ msg, isStreaming }: { msg: ChatMessage; isStreaming?: boolean }) {
  const isUser = msg.role === 'user'

  // Parse assistant message: split into text and code blocks
  function renderAssistantContent(content: string) {
    const parts = content.split(/(```(?:javascript|js)[\s\S]*?```)/g)
    return parts.map((part, i) => {
      const codeMatch = part.match(/```(?:javascript|js)\s*([\s\S]*?)```/)
      if (codeMatch) {
        return <CodeBlock key={i} code={codeMatch[1].trim()} />
      }
      return part ? (
        <p key={i} className="text-xs font-light text-white/80 leading-relaxed whitespace-pre-wrap">
          {part}
        </p>
      ) : null
    })
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm bg-primary/15 border border-primary/20">
          <p className="text-xs font-light text-white/90 leading-relaxed">{msg.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] space-y-1">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary/60 to-[#14F195]/40 flex-shrink-0" />
          <span className="text-[9px] font-light text-white/30 uppercase tracking-widest">AI</span>
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
        </div>
        <div className="pl-5 space-y-1">{renderAssistantContent(msg.content)}</div>
      </div>
    </div>
  )
}

const STARTER_PROMPTS = [
  'Make a Flappy Bird clone',
  'Create a Snake game',
  'Build a simple Pong game',
  'Make a brick breaker game',
  'Create an asteroid shooter',
]

export function CreatorChat({ gameId, onEditCode, onPreview }: CreatorChatProps) {
  const game = useCreatorStore((s) => s.games.find((g) => g.id === gameId))
  const updateName = useCreatorStore((s) => s.updateName)
  const { send, streaming, streamedText } = useGameGenerator(gameId)
  const [input, setInput] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const messages = game?.chatHistory ?? []
  const hasCode = !!(game?.code)

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
    send(trimmed)
  }

  function handleNameSave() {
    if (nameInput.trim()) updateName(gameId, nameInput.trim())
    setEditingName(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
              className="bg-transparent text-sm font-light text-foreground outline-none border-b border-primary/50 pb-0.5 min-w-0 max-w-[160px]"
            />
          ) : (
            <button
              onClick={() => {
                setNameInput(game?.name ?? '')
                setEditingName(true)
              }}
              className="text-sm font-light text-foreground hover:text-primary transition-colors truncate max-w-[160px]"
            >
              {game?.name ?? 'Untitled Game'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {hasCode && (
            <button
              onClick={onEditCode}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-light text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all"
            >
              <Code2 size={11} />
              Edit Code
            </button>
          )}
          {hasCode && (
            <button
              onClick={onPreview}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-all"
            >
              <Eye size={11} />
              Preview
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4">
        {messages.length === 0 && !streaming ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full gap-5"
          >
            <div className="text-center space-y-1">
              <p className="text-sm font-light text-foreground/60">Describe your game</p>
              <p className="text-xs font-light text-muted-foreground/50">
                AI will generate a playable Canvas game
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setInput(prompt)
                    textareaRef.current?.focus()
                  }}
                  className="text-left px-3 py-2 rounded-xl border border-border/30 text-xs font-light text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <MessageBubble msg={msg} />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Streaming bubble */}
            {streaming && streamedText && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <MessageBubble
                  msg={{ role: 'assistant', content: streamedText }}
                  isStreaming
                />
              </motion.div>
            )}
            {streaming && !streamedText && (
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
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0 border-t border-border/30">
        <div
          className={cn(
            'flex items-end gap-2 rounded-2xl border border-border/40 bg-muted/10 px-3 py-2 transition-all',
            'focus-within:border-primary/40 focus-within:bg-muted/20',
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              messages.length === 0 ? 'Describe your game idea...' : 'Ask for changes...'
            }
            rows={1}
            disabled={streaming}
            className="flex-1 bg-transparent text-xs font-light text-foreground placeholder:text-muted-foreground/40 outline-none resize-none max-h-28 overflow-y-auto leading-relaxed disabled:opacity-50"
            style={{ minHeight: '20px' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 112) + 'px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className={cn(
              'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all mb-0.5',
              input.trim() && !streaming
                ? 'bg-primary text-black hover:bg-primary/80'
                : 'bg-muted/20 text-muted-foreground/40',
            )}
          >
            <Send size={12} />
          </button>
        </div>
        <p className="text-[9px] font-light text-muted-foreground/30 text-center mt-1.5">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  )
}
