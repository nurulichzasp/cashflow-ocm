/**
 * Migrasi additif: kolom `biaya_operasional.kategori_lain` (text, nullable) untuk
 * menyimpan nama kategori custom saat kategori = 'lainnya'. Idempoten + non-destruktif
 * (ADD COLUMN hanya bila belum ada). Tidak menyentuh `catatan` (note user-facing).
 * Jalankan: npx tsx scripts/add-biaya-kategori-lain.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@libsql/client'

const TARGETS: Array<{ table: string; column: string; type: string }> = [
  { table: 'biaya_operasional', column: 'kategori_lain', type: 'text' },
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
  if (!allOk) throw new Error('Kolom kategori_lain gagal dipasang')
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('GAGAL:', e)
  process.exit(1)
})
