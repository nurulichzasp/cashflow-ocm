/**
 * Migrasi additif: tabel key-value `app_settings` untuk pengaturan global
 * (sinkron lintas perangkat/pengguna), menggantikan localStorage per-device.
 * Contoh penggunaan: key='neraca_modal_awal' → Modal Awal pada laporan Neraca.
 *
 * Idempoten + non-destruktif: hanya `CREATE TABLE IF NOT EXISTS`, tidak pernah
 * menghapus/menyentuh data lama. Aman dijalankan berkali-kali.
 *
 * Jalankan: npx tsx scripts/add-app-settings-table.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@libsql/client'

const TABLE = 'app_settings'

async function hasTable(client: ReturnType<typeof createClient>, table: string) {
  const res = await client.execute({
    sql: `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,
    args: [table],
  })
  return res.rows.length > 0
}

async function main() {
  const url = process.env.TURSO_CONNECTION_URL
  if (!url) throw new Error('TURSO_CONNECTION_URL tidak diset di .env.local')
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })

  console.log(`Target DB: ${url.replace(/(libsql:\/\/[^.]*).*/, '$1…')}\n`)

  const existedBefore = await hasTable(client, TABLE)
  if (existedBefore) {
    console.log(`[=] tabel ${TABLE} sudah ada (skip CREATE TABLE)`)
  }

  // IF NOT EXISTS → aman & non-destruktif walau tabel sudah ada.
  await client.execute(
    `CREATE TABLE IF NOT EXISTS ${TABLE} (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
  )
  if (!existedBefore) {
    console.log(`[+] tabel ${TABLE} DIBUAT`)
  }

  console.log('\n— Verifikasi akhir —')
  const ok = await hasTable(client, TABLE)
  console.log(`  tabel ${TABLE}: ${ok ? 'OK' : 'MISSING ❌'}`)
  console.log(ok ? '\n✅ Migrasi additif selesai.' : '\n❌ Tabel belum terpasang.')
  if (!ok) throw new Error(`Tabel ${TABLE} gagal dibuat`)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('GAGAL:', e)
  process.exit(1)
})
