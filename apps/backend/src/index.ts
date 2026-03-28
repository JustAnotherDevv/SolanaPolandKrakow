import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import gamesRouter from './routes/games'
import generateRouter from './routes/generate'
import assetsRouter from './routes/assets'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }))

// Routes
app.use('/api/games', generateRouter)  // message + stream endpoints first
app.use('/api/games', gamesRouter)
app.use('/api/assets', assetsRouter)

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
