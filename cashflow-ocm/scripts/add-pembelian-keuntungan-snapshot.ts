/**
 * Migrasi additif (audit 2026-06-22, W2): kolom snapshot tarif untung/kg peron
 * pada tabel pembelian → membekukan untung historis tiket terhadap edit.
 *   - pembelian.keuntungan_per_kg (integer, nullable)
 *     null = baris lama (fallback ke peron.keuntunganPerKg live saat edit).
 * Idempoten: ALTER TABLE ... ADD COLUMN hanya dijalankan bila kolom belum ada.
 * Tidak menyentuh/menghapus data lama. Aman dijalankan berkali-kali (vercel-build).
 * Jalankan manual: npx tsx scripts/add-pembelian-keuntungan-snapshot.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@libsql/client'

const TARGETS: Array<{ table: string; column: string; type: string }> = [
  { table: 'pembelian', column: 'keuntungan_per_kg', type: 'integer' },
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
