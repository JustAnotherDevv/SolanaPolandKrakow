import { db, generateId } from '../db/client'
import { chatCompletion, streamChatCompletion } from '../lib/openrouter'
import { GAME_JUICE_LIB, buildSystemPrompt } from './prompts'
import { build3DSystemPrompt } from './prompts3d'
import { TOOL_DEFS, executeTool } from './tools'
import { TOOL_DEFS_3D, executeTool3D } from './tools3d'
import type { Message } from '../lib/openrouter'
import type { StepEmitter } from './types'

const AGENT_MODEL = process.env.AGENT_MODEL ?? 'anthropic/claude-3.5-sonnet'
const CODE_MODEL = process.env.CODE_MODEL ?? 'google/gemini-2.0-flash-001'
const MAX_STEPS = 50
const MAX_AUTOFIX = 3

function saveMessage(gameId: string, msg: Message) {
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

/** Check JS syntax using Node's Function constructor. Returns error string or null. */
function checkSyntax(code: string): string | null {
  try {
    new Function(code) // eslint-disable-line no-new-func
    return null
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

/** Prepend GameJuice library if not already present in code. */
function injectGameJuice(code: string): string {
  if (code.includes('class Particles') || code.includes('class ScreenShake')) return code
  return GAME_JUICE_LIB + '\n' + code
}

/** Strip markdown fences if the LLM wrapped output. */
function stripFences(code: string): string {
  const fenceMatch = code.match(/```(?:javascript|js|typescript|ts)?\s*\n([\s\S]*?)```/)
  return fenceMatch ? fenceMatch[1].trim() : code.trim()
}

/**
 * Auto-fix syntax errors using CODE_MODEL.
 * Emits a code_reset + new code_chunks on each attempt.
 */
async function autoFixSyntax(
  code: string,
  syntaxErr: string,
  emit: StepEmitter,
  attempt = 1,
): Promise<string> {
  if (attempt > MAX_AUTOFIX) {
    emit({ type: 'agent_step', data: { message: `⚠️ Could not auto-fix after ${MAX_AUTOFIX} attempts`, icon: '⚠️', step: 'error' } })
    return code // return best effort
  }

  emit({ type: 'agent_step', data: {
    message: `🔧 Auto-fixing syntax error (attempt ${attempt}/${MAX_AUTOFIX})...`,
    icon: '🔧', step: 'autofix',
  }})

  const messages: Message[] = [
    { role: 'system', content: 'You fix JavaScript syntax errors. Return ONLY valid JavaScript code with no markdown, no explanation, no fences.' },
    { role: 'user', content: `Fix this JavaScript syntax error and return the corrected complete code:\n\nError: ${syntaxErr}\n\nCode:\n${code}` },
  ]

  let fixed = ''
  try {
    // Signal frontend to reset accumulated code before new chunks
    emit({ type: 'code_reset', data: {} })

    for await (const chunk of streamChatCompletion(CODE_MODEL, messages)) {
      fixed += chunk
      emit({ type: 'code_chunk', data: { delta: chunk } })
    }
    fixed = stripFences(fixed)
  } catch {
    return code
  }

  const newErr = checkSyntax(fixed)
  if (!newErr) return fixed
  return autoFixSyntax(fixed, newErr, emit, attempt + 1)
}

/**
 * Finalize code: inject GameJuice, validate syntax, auto-fix if needed.
 * Returns the verified final code.
 */
async function finalizeCode(rawCode: string, emit: StepEmitter): Promise<string> {
  emit({ type: 'coding', data: { message: 'Finalizing game code...' } })

  let code = stripFences(rawCode)
  code = injectGameJuice(code)

  // Emit full code as one chunk
  emit({ type: 'code_reset', data: {} })
  emit({ type: 'code_chunk', data: { delta: code } })

  // Syntax check
  const syntaxErr = checkSyntax(code)
  if (syntaxErr) {
    emit({ type: 'agent_step', data: { message: `⚠️ Syntax error detected: ${syntaxErr}`, icon: '⚠️', step: 'syntax_error' } })
    code = await autoFixSyntax(code, syntaxErr, emit)
  } else {
    emit({ type: 'agent_step', data: { message: '✓ Code validated — no syntax errors', icon: '✓', step: 'validated' } })
  }

  return code
}

/**
 * Finalize 3D code: validate syntax, auto-fix if needed. No GameJuice injection.
 */
async function finalizeCode3D(rawCode: string, emit: StepEmitter): Promise<string> {
  emit({ type: 'coding', data: { message: 'Finalizing 3D game code...' } })

  let code = stripFences(rawCode)

  emit({ type: 'code_reset', data: {} })
  emit({ type: 'code_chunk', data: { delta: code } })

  const syntaxErr = checkSyntax(code)
  if (syntaxErr) {
    emit({ type: 'agent_step', data: { message: `⚠️ Syntax error detected: ${syntaxErr}`, icon: '⚠️', step: 'syntax_error' } })
    code = await autoFixSyntax(code, syntaxErr, emit)
  } else {
    emit({ type: 'agent_step', data: { message: '✓ 3D code validated', icon: '✓', step: 'validated' } })
  }

  return code
}

export async function runAgentLoop(
  gameId: string,
  userMessage: string,
  emit: StepEmitter,
  mode: '2d' | '3d' = '2d',
): Promise<{ code: string; name: string }> {
  const history = loadHistory(gameId)

  const userMsg: Message = { role: 'user', content: userMessage }
  history.push(userMsg)
  saveMessage(gameId, userMsg)

  const isFix = userMessage.trimStart().startsWith('[FIX_ERROR]')
  const fixPrompt = `You are fixing a broken JavaScript game. The user provides the runtime error and current code.
Analyze the error, fix it, and immediately call ${mode === '3d' ? 'write_3d_game_code' : 'write_game_code'} with the corrected JavaScript.
Rules:
- Do NOT call web_search, generate_sprite, or any other tool
- ONLY call ${mode === '3d' ? 'write_3d_game_code' : 'write_game_code'} once with the fixed code
- Keep all existing asset URLs, game juice, and logic intact
- Fix ONLY what causes the error`

  const systemContent = isFix ? fixPrompt : (mode === '3d' ? build3DSystemPrompt() : buildSystemPrompt())

  const allTools = mode === '3d' ? TOOL_DEFS_3D : TOOL_DEFS
  const toolsToUse = isFix
    ? allTools.filter((t) => t.function.name === (mode === '3d' ? 'write_3d_game_code' : 'write_game_code'))
    : allTools

  const systemMsg: Message = { role: 'system', content: systemContent }
  const messages: Message[] = [systemMsg, ...history]

  let finalCode = ''
  let finalName = 'AI Game'
  let steps = 0

  emit({ type: 'agent_step', data: {
    message: isFix ? 'Fixing runtime error...' : 'Starting game creation...',
    icon: isFix ? '🔧' : '🎮',
    step: 'start',
  }})

  while (steps < MAX_STEPS) {
    steps++

    const response = await chatCompletion(AGENT_MODEL, messages, toolsToUse, isFix ? 0.3 : 0.7)
    const choice = response.choices[0]
    if (!choice) throw new Error('Empty response from AI')

    const assistantMsg: Message = {
      role: 'assistant',
      content: choice.message.content ?? null,
      tool_calls: choice.message.tool_calls,
    }
    messages.push(assistantMsg)
    saveMessage(gameId, assistantMsg)

    if (!choice.message.tool_calls?.length) {
      if (choice.finish_reason === 'stop') break
      continue
    }

    for (const toolCall of choice.message.tool_calls) {
      const toolName = toolCall.function.name
      let args: Record<string, unknown>
      try {
        args = JSON.parse(toolCall.function.arguments)
      } catch {
        args = {}
      }

      // Always inject the real gameId — the LLM doesn't know it
      args.gameId = gameId

      let result: unknown
      let isDone = false

      try {
        const out = mode === '3d'
          ? await executeTool3D(toolName, args, emit)
          : await executeTool(toolName, args, emit)
        result = out.result
        isDone = out.done ?? false

        if (isDone && out.code) {
          // 3D games: no GameJuice injection — Three.js is injected by the preview
          finalCode = mode === '3d'
            ? await finalizeCode3D(out.code, emit)
            : await finalizeCode(out.code, emit)
          finalName = out.name ?? (mode === '3d' ? 'AI 3D Game' : 'AI Game')
        }
      } catch (err) {
        result = { error: String(err) }
        emit({ type: 'agent_step', data: { message: `⚠️ Tool error: ${String(err)}`, icon: '⚠️', step: 'error' } })
      }

      const toolResultMsg: Message = {
        role: 'tool',
        content: JSON.stringify(result),
        tool_call_id: toolCall.id,
      }
      messages.push(toolResultMsg)
      saveMessage(gameId, toolResultMsg)

      if (isDone) {
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
