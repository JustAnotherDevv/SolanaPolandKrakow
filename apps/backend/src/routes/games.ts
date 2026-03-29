import { Router } from 'express'
import { db, generateId } from '../db/client'

const router = Router()

// POST /api/games — create new game (accepts optional id from body)
router.post('/', (req, res) => {
  const body = req.body as { id?: string; name?: string }
  const id = body.id ?? generateId()
  const name = body.name ?? 'Untitled Game'
  const now = Date.now()
  // Upsert — if game already exists just return it
  const existing = db.prepare(`SELECT id, name, code, created_at FROM games WHERE id = ?`).get(id) as {
    id: string; name: string; code: string; created_at: number
  } | undefined
  if (existing) return res.json({ id: existing.id, name: existing.name, code: existing.code, createdAt: existing.created_at })
  db.prepare(`INSERT INTO games (id, name, code, created_at, updated_at) VALUES (?, ?, '', ?, ?)`).run(id, name, now, now)
  return res.json({ id, name, code: '', createdAt: now })
})

// GET /api/games/:id
router.get('/:id', (req, res) => {
  const game = db.prepare(`SELECT * FROM games WHERE id = ?`).get(req.params.id) as {
    id: string; name: string; code: string; created_at: number; updated_at: number
  } | undefined
  if (!game) return res.status(404).json({ error: 'Game not found' })

  const assets = db.prepare(`SELECT id, name, type, prompt, width, height, created_at FROM assets WHERE game_id = ? ORDER BY created_at ASC`).all(req.params.id)
  const structures = db.prepare(`SELECT id, type, name, data, created_at FROM game_structures WHERE game_id = ? ORDER BY created_at ASC`).all(req.params.id) as Array<{
    id: string; type: string; name: string; data: string; created_at: number
  }>

  const port = process.env.PORT ?? 3001
  return res.json({
    id: game.id,
    name: game.name,
    code: game.code,
    createdAt: game.created_at,
    updatedAt: game.updated_at,
    assets: (assets as Array<{ id: string; name: string; type: string; prompt: string; width: number; height: number; created_at: number }>).map((a) => ({
      ...a,
      createdAt: a.created_at,
      url: `http://localhost:${port}/api/assets/${a.id}`,
    })),
    structures: structures.map((s) => ({
      id: s.id,
      type: s.type,
      name: s.name,
      data: JSON.parse(s.data),
      createdAt: s.created_at,
    })),
  })
})

// GET /api/games/:id/assets
router.get('/:id/assets', (req, res) => {
  const port = process.env.PORT ?? 3001
  const rows = db.prepare(`SELECT id, name, type, prompt, width, height, created_at FROM assets WHERE game_id = ? ORDER BY created_at ASC`).all(req.params.id) as Array<{
    id: string; name: string; type: string; prompt: string; width: number; height: number; created_at: number
  }>
  res.json(rows.map((r) => ({
    ...r,
    createdAt: r.created_at,
    url: `http://localhost:${port}/api/assets/${r.id}`,
  })))
})

// GET /api/games/:id/structures
router.get('/:id/structures', (req, res) => {
  const rows = db.prepare(`SELECT id, type, name, data, created_at FROM game_structures WHERE game_id = ? ORDER BY created_at ASC`).all(req.params.id) as Array<{
    id: string; type: string; name: string; data: string; created_at: number
  }>
  res.json(rows.map((r) => ({
    id: r.id,
    type: r.type,
    name: r.name,
    data: JSON.parse(r.data),
    createdAt: r.created_at,
  })))
})

// DELETE /api/games/:id
router.delete('/:id', (req, res) => {
  db.prepare(`DELETE FROM games WHERE id = ?`).run(req.params.id)
  res.json({ ok: true })
})

export default router
