/**
 * Migrasi ADDITIF untuk modul Retensi Peron — tabel peron_ancaman.
 * Idempoten & AMAN: hanya CREATE TABLE/INDEX IF NOT EXISTS. Tidak menyentuh,
 * mengubah, atau menghapus data/tabel yang sudah ada.
 *   Jalankan: npx tsx scripts/add-peron-ancaman-table.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@libsql/client'

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS peron_ancaman (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    peron_id TEXT NOT NULL REFERENCES peron(id) ON DELETE CASCADE,
    tanggal TEXT NOT NULL,
    produk TEXT NOT NULL,
    harga_acuan_saat INTEGER NOT NULL,
    harga_kompetitor INTEGER NOT NULL,
    keuntungan_sebelum INTEGER NOT NULL,
    keuntungan_sesudah INTEGER,
    volume_acuan REAL,
    tindakan TEXT NOT NULL,
    catatan TEXT,
    created_by TEXT REFERENCES user(id),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE INDEX IF NOT EXISTS peron_ancaman_peron_idx ON peron_ancaman (peron_id)`,
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
  console.log('Selesai — tabel peron_ancaman siap (idempoten).')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
