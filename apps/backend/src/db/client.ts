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

// Migrate existing DBs — add columns if they don't exist yet
for (const sql of [
  `ALTER TABLE games ADD COLUMN type TEXT NOT NULL DEFAULT '2d'`,
  `ALTER TABLE games ADD COLUMN scene TEXT NOT NULL DEFAULT ''`,
]) {
  try { db.exec(sql) } catch { /* column already exists */ }
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
