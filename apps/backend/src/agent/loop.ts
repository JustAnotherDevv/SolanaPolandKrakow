import { db } from '../db/client'
import { chatCompletion, streamChatCompletion } from '../lib/openrouter'
import { GAME_JUICE_LIB, buildSystemPrompt } from './prompts'
import { TOOL_DEFS, executeTool } from './tools'
import type { Message } from '../lib/openrouter'
import type { StepEmitter } from './types'

const AGENT_MODEL = process.env.AGENT_MODEL ?? 'anthropic/claude-3.5-sonnet'
const CODE_MODEL = process.env.CODE_MODEL ?? 'google/gemini-2.0-flash-001'
const MAX_STEPS = 25

function saveMessage(gameId: string, msg: Message) {
  const { generateId } = require('../db/client')
  db.prepare(`INSERT INTO conversations (id, game_id, role, content, tool_calls, tool_call_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    generateId(),
    gameId,
    msg.role,
    msg.content ?? '',
    msg.tool_calls ? JSON.stringify(msg.tool_calls) : null,
    msg.tool_call_id ?? null,
    Date.now(),
  )
}

function loadHistory(gameId: string): Message[] {
  const rows = db.prepare(`SELECT role, content, tool_calls, tool_call_id FROM conversations
    WHERE game_id = ? ORDER BY created_at ASC`).all(gameId) as Array<{
      role: string; content: string; tool_calls: string | null; tool_call_id: string | null
    }>
  return rows.map((r) => ({
    role: r.role as Message['role'],
    content: r.content,
    tool_calls: r.tool_calls ? JSON.parse(r.tool_calls) : undefined,
    tool_call_id: r.tool_call_id ?? undefined,
  }))
}

export async function runAgentLoop(
  gameId: string,
  userMessage: string,
  emit: StepEmitter,
): Promise<{ code: string; name: string }> {
  // Load conversation history
  const history = loadHistory(gameId)

  // Add user message
  const userMsg: Message = { role: 'user', content: userMessage }
  history.push(userMsg)
  saveMessage(gameId, userMsg)

  const systemMsg: Message = { role: 'system', content: buildSystemPrompt() }
  const messages: Message[] = [systemMsg, ...history]

  let finalCode = ''
  let finalName = 'AI Game'
  let steps = 0

  emit({ type: 'agent_step', data: { message: 'Starting game creation...', icon: '🎮', step: 'start' } })

  while (steps < MAX_STEPS) {
    steps++

    const response = await chatCompletion(AGENT_MODEL, messages, TOOL_DEFS, 0.7)
    const choice = response.choices[0]
    if (!choice) throw new Error('Empty response from AI')

    const assistantMsg: Message = {
      role: 'assistant',
      content: choice.message.content ?? null,
      tool_calls: choice.message.tool_calls,
    }
    messages.push(assistantMsg)
    saveMessage(gameId, assistantMsg)

    // No tool calls — text response (shouldn't happen in normal flow, but handle gracefully)
    if (!choice.message.tool_calls?.length) {
      if (choice.finish_reason === 'stop') break
      continue
    }

    // Execute each tool call
    for (const toolCall of choice.message.tool_calls) {
      const toolName = toolCall.function.name
      let args: Record<string, unknown>
      try {
        args = JSON.parse(toolCall.function.arguments)
      } catch {
        args = {}
      }

      let result: unknown
      let isDone = false

      try {
        const out = await executeTool(toolName, args, emit)
        result = out.result
        isDone = out.done ?? false

        if (isDone && out.code) {
          // Stream the final code generation
          const code = await streamCode(gameId, out.code, emit)
          finalCode = code
          finalName = out.name ?? 'AI Game'
        }
      } catch (err) {
        result = { error: String(err) }
        emit({ type: 'error', data: { message: String(err) } })
      }

      const toolResultMsg: Message = {
        role: 'tool',
        content: JSON.stringify(result),
        tool_call_id: toolCall.id,
      }
      messages.push(toolResultMsg)
      saveMessage(gameId, toolResultMsg)

      if (isDone) {
        // Update game code in DB
        db.prepare(`UPDATE games SET code = ?, name = ?, updated_at = ? WHERE id = ?`).run(
          finalCode, finalName, Date.now(), gameId,
        )
        emit({ type: 'done', data: { gameId, name: finalName } })
        return { code: finalCode, name: finalName }
      }
    }
  }

  throw new Error('Agent loop exceeded maximum steps without finishing')
}

async function streamCode(_gameId: string, rawCode: string, emit: StepEmitter): Promise<string> {
  emit({ type: 'coding', data: { message: 'Writing game code with game juice...' } })

  // Ask CODE_MODEL to finalize and inject game juice
  const finalPrompt = `You are given a game code draft. Your job is to:
1. Inject the GameJuice library at the top (before the Game class)
2. Ensure ALL game juice features are actively used (particles, shake, sound, popups)
3. Ensure sprites are loaded from the asset URLs in the code
4. Return ONLY the complete JavaScript code, no markdown, no explanation

GameJuice Library to inject:
${GAME_JUICE_LIB}

Draft code:
${rawCode}

Return the complete final JavaScript code:`

  const codeMessages: Message[] = [
    { role: 'system', content: 'You are a game code finalizer. Return only valid JavaScript code, no markdown.' },
    { role: 'user', content: finalPrompt },
  ]

  let fullCode = ''
  try {
    const stream = streamChatCompletion(CODE_MODEL, codeMessages)
    for await (const chunk of stream) {
      fullCode += chunk
      emit({ type: 'code_chunk', data: { delta: chunk } })
    }
    // Strip markdown fences if model wrapped it
    fullCode = fullCode.replace(/^```[a-z]*\n?/m, '').replace(/```\s*$/m, '').trim()
  } catch {
    // Fallback: use raw code with game juice prepended
    fullCode = GAME_JUICE_LIB + '\n' + rawCode
    emit({ type: 'code_chunk', data: { delta: fullCode } })
  }

  return fullCode
}
