/**
 * Migrasi ADDITIF untuk Portal Peron — 1 tabel token akses publik.
 * Idempoten & AMAN: hanya CREATE TABLE/INDEX IF NOT EXISTS.
 *   Jalankan: npx tsx scripts/add-peron-access-table.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@libsql/client'

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS peron_access (
    peron_id TEXT PRIMARY KEY REFERENCES peron(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    issued_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_viewed_at INTEGER
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS peron_access_token_idx ON peron_access (token)`,
]

async function main() {
  const url = process.env.TURSO_CONNECTION_URL
  if (!url) throw new Error('TURSO_CONNECTION_URL tidak diset di .env.local')
  console.log('Target DB:', url.replace(/\/\/.*@/, '//***@'))
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })
  for (const stmt of STATEMENTS) {
    const name = stmt.match(/(?:TABLE|INDEX) IF NOT EXISTS (\w+)/)?.[1] ?? '?'
    await client.execute(stmt)
    console.log('✓', name)
  }
  console.log('Selesai — tabel peron_access siap (idempoten).')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
