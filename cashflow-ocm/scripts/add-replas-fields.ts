/**
 * Migrasi additif untuk fitur "Harga Otomatis Per Baris (berbasis tanggal replas)".
 * Idempoten: aman dijalankan berkali-kali. Tidak menyentuh/menghapus data lama.
 *   - pembelian_detail.tanggal_replas_sampai (text)  → akhir rentang (null = tanggal tunggal)
 *   - pembelian_detail.jumlah_replas (integer)        → jumlah replas di baris itu
 *   - pembelian.keterangan (text)                     → keterangan otomatis tiket (bisa diedit)
 * ALTER TABLE ... ADD COLUMN hanya dijalankan bila kolom belum ada.
 * Jalankan: npx tsx scripts/add-replas-fields.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@libsql/client'

const TARGETS: Array<{ table: string; column: string; type: string }> = [
  { table: 'pembelian_detail', column: 'tanggal_replas_sampai', type: 'text' },
  { table: 'pembelian_detail', column: 'jumlah_replas', type: 'integer' },
  { table: 'pembelian', column: 'keterangan', type: 'text' },
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

  for (const { table, column, type } of TARGETS) {
    if (await hasColumn(client, table, column)) {
      console.log(`[=] ${table}.${column} sudah ada (skip ADD COLUMN)`)
    } else {
      await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
      console.log(`[+] ${table}.${column} DITAMBAHKAN`)
    }
  }

  console.log('\n— Verifikasi akhir —')
  let allOk = true
  for (const { table, column } of TARGETS) {
    const ok = await hasColumn(client, table, column)
    if (!ok) allOk = false
    console.log(`  ${table}.${column}: ${ok ? 'OK' : 'MISSING ❌'}`)
  }
  console.log(allOk ? '\n✅ Migrasi additif selesai.' : '\n❌ Ada kolom yang belum terpasang.')
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('GAGAL:', e)
  process.exit(1)
})
