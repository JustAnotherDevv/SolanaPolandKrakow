import { Router, Request, Response } from 'express'
import { db } from '../db/client'
import { runAgentLoop } from '../agent/loop'
import type { AgentStep } from '../agent/types'

const router = Router()

// Active SSE connections: gameId → Response
const connections = new Map<string, Response>()

// POST /api/games/:id/message — trigger agent generation
router.post('/:id/message', async (req, res) => {
  const gameId = req.params.id
  const { message, mode } = req.body as { message: string; mode?: '2d' | '3d' }

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

  // Detect game type from DB if mode not provided
  let gameMode: '2d' | '3d' = mode ?? '2d'
  if (!mode) {
    const gameRow = db.prepare(`SELECT type FROM games WHERE id = ?`).get(gameId) as { type?: string } | undefined
    if (gameRow?.type === '3d') gameMode = '3d'
  }

  try {
    await runAgentLoop(gameId, message, emit, gameMode)
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

export default router
