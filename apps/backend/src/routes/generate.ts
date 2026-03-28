import { Router, Request, Response } from 'express'
import { db, generateId } from '../db/client'
import { runAgentLoop } from '../agent/loop'
import type { AgentStep } from '../agent/types'

const router = Router()

// Active SSE connections: gameId → Response
const connections = new Map<string, Response>()

// POST /api/games/:id/message — trigger agent generation
router.post('/:id/message', async (req, res) => {
  const gameId = req.params.id
  const { message } = req.body as { message: string }

  if (!message?.trim()) return res.status(400).json({ error: 'message required' })

  const game = db.prepare(`SELECT id FROM games WHERE id = ?`).get(gameId)
  if (!game) return res.status(404).json({ error: 'Game not found' })

  // Acknowledge immediately
  res.json({ ok: true, gameId })

  // Run agent asynchronously, emitting to SSE connection
  const emit = (step: AgentStep) => {
    const sseRes = connections.get(gameId)
    if (!sseRes) return
    const event = step.type
    const data = JSON.stringify(step.data)
    sseRes.write(`event: ${event}\ndata: ${data}\n\n`)
  }

  try {
    await runAgentLoop(gameId, message, emit)
  } catch (err) {
    emit({ type: 'error', data: { message: String(err) } })
  }
  return
})

// GET /api/games/:id/stream — SSE connection
router.get('/:id/stream', (req: Request, res: Response) => {
  const gameId = String(req.params.id)

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })
  res.flushHeaders()

  // Send a heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n')
  }, 15000)

  connections.set(gameId, res)

  req.on('close', () => {
    clearInterval(heartbeat)
    connections.delete(gameId)
  })
})

// POST /api/games — create game and return id (convenience)
router.post('/new', (req, res) => {
  const id = generateId()
  const now = Date.now()
  const name = (req.body as { name?: string })?.name ?? 'Untitled Game'
  db.prepare(`INSERT INTO games (id, name, code, created_at, updated_at) VALUES (?, ?, '', ?, ?)`).run(id, name, now, now)
  res.json({ id, name, createdAt: now })
})

export default router
