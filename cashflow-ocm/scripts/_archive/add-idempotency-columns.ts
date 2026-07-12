/**
 * Migrasi additif idempotency_key (anti-dobel race-proof).
 * Idempoten: aman dijalankan berkali-kali. Tidak menyentuh/menghapus data lama.
 *   - ALTER TABLE ... ADD COLUMN hanya jika kolom belum ada.
 *   - CREATE UNIQUE INDEX IF NOT EXISTS (NULL di SQLite dianggap distinct, jadi
 *     baris lama yang NULL tidak saling bentrok).
 * Jalankan: npx tsx scripts/add-idempotency-columns.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@libsql/client'

const TARGETS = [
  { table: 'pembelian', index: 'pembelian_idempotency_key_idx' },
  { table: 'penjualan', index: 'penjualan_idempotency_key_idx' },
  { table: 'biaya_operasional', index: 'biaya_operasional_idempotency_key_idx' },
  { table: 'transaksi_kas', index: 'transaksi_kas_idempotency_key_idx' },
  { table: 'modal_peron', index: 'modal_peron_idempotency_key_idx' },
]

async function hasColumn(client: ReturnType<typeof createClient>, table: string, column: string) {
  const info = await client.execute(`PRAGMA table_info(${table})`)
  return info.rows.some((r) => (r as Record<string, unknown>).name === column)
}

async function main() {
  const url = process.env.TURSO_CONNECTION_URL
  if (!url) throw new Error('TURSO_CONNECTION_URL tidak diset di .env.local')
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })

  console.log(`Target DB: ${url.replace(/(libsql:\/\/[^.]*).*/, '$1…')}\n`)

  for (const { table, index } of TARGETS) {
    if (await hasColumn(client, table, 'idempotency_key')) {
      console.log(`[=] ${table}: kolom idempotency_key sudah ada (skip ADD COLUMN)`)
    } else {
      await client.execute(`ALTER TABLE ${table} ADD COLUMN idempotency_key text`)
      console.log(`[+] ${table}: kolom idempotency_key DITAMBAHKAN`)
    }
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS ${index} ON ${table} (idempotency_key)`)
    console.log(`[+] ${table}: unique index ${index} dipastikan ada`)
  }

  console.log('\n— Verifikasi akhir —')
  let allOk = true
  for (const { table } of TARGETS) {
    const ok = await hasColumn(client, table, 'idempotency_key')
    if (!ok) allOk = false
    console.log(`  ${table}.idempotency_key: ${ok ? 'OK' : 'MISSING ❌'}`)
  }
  console.log(allOk ? '\n✅ Migrasi additif selesai.' : '\n❌ Ada kolom yang belum terpasang.')
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('GAGAL:', e)
  process.exit(1)
})
