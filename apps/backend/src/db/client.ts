import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { SCHEMA } from './schema'

const dbPath = process.env.DB_PATH ?? './data/gamefeed.db'
const resolved = path.resolve(dbPath)
fs.mkdirSync(path.dirname(resolved), { recursive: true })

export const db = new Database(resolved)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.exec(SCHEMA)

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
