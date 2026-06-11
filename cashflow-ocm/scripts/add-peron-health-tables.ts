/**
 * Migrasi ADDITIF untuk modul Kesehatan Peron — 3 tabel baru.
 * Idempoten & AMAN: hanya CREATE TABLE/INDEX IF NOT EXISTS. Tidak menyentuh,
 * mengubah, atau menghapus data/tabel yang sudah ada.
 *   Jalankan: npx tsx scripts/add-peron-health-tables.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@libsql/client'

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS peron_snapshot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    peron_id TEXT NOT NULL REFERENCES peron(id) ON DELETE CASCADE,
    week_start TEXT NOT NULL,
    total_kg REAL NOT NULL DEFAULT 0,
    setor_count INTEGER NOT NULL DEFAULT 0,
    share REAL NOT NULL DEFAULT 0,
    is_operational_week INTEGER NOT NULL DEFAULT 1,
    computed_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS peron_snapshot_peron_week_idx ON peron_snapshot (peron_id, week_start)`,
  `CREATE TABLE IF NOT EXISTS peron_health (
    peron_id TEXT PRIMARY KEY REFERENCES peron(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'data_kurang',
    share_current REAL NOT NULL DEFAULT 0,
    share_base REAL NOT NULL DEFAULT 0,
    share_delta REAL NOT NULL DEFAULT 0,
    decline_weeks INTEGER NOT NULL DEFAULT 0,
    typical_gap REAL NOT NULL DEFAULT 0,
    days_since_last INTEGER NOT NULL DEFAULT 0,
    last_setor_date TEXT,
    season_verdict TEXT,
    is_archived INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS peron_followup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    peron_id TEXT NOT NULL REFERENCES peron(id) ON DELETE CASCADE,
    triggered_status TEXT NOT NULL,
    contacted INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    note TEXT,
    outcome TEXT,
    created_by TEXT REFERENCES user(id),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
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
  console.log('Selesai — 3 tabel kesehatan peron siap (idempoten).')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
