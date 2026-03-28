import { Router } from 'express'
import { db } from '../db/client'

const router = Router()

// GET /api/assets/:id — serve PNG from SQLite BLOB
router.get('/:id', (req, res) => {
  const row = db.prepare(`SELECT data, type FROM assets WHERE id = ?`).get(req.params.id) as {
    data: Buffer; type: string
  } | undefined

  if (!row) return res.status(404).json({ error: 'Asset not found' })

  res.set('Content-Type', 'image/png')
  res.set('Cache-Control', 'public, max-age=86400')
  return res.send(row.data)
})

export default router
