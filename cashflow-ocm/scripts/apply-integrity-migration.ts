import { config } from 'dotenv'
config({ path: '.env.local' })

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@libsql/client'

async function main() {
  const apply = process.argv.includes('--apply')
  const url = process.env.TURSO_CONNECTION_URL
  if (!url) throw new Error('TURSO_CONNECTION_URL tidak diset di .env.local')
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })

  const [owners, duplicateRefs] = await Promise.all([
    client.execute("SELECT count(*) AS n FROM user WHERE lower(role) = 'owner'"),
    client.execute("SELECT ref_tabel, ref_id, count(*) AS n FROM transaksi_kas WHERE ref_tabel IS NOT NULL AND ref_id IS NOT NULL GROUP BY ref_tabel, ref_id HAVING count(*) > 1 LIMIT 5"),
  ])
  if (Number(owners.rows[0]?.n ?? 0) < 1) throw new Error('Migrasi dibatalkan: owner tidak ditemukan')
  if (duplicateRefs.rows.length > 0) throw new Error('Migrasi dibatalkan: ada referensi transaksi kas ganda')

  const [pembelianColumns, modalColumns] = await Promise.all([
    client.execute("SELECT name FROM pragma_table_info('pembelian') WHERE name = 'brdl_sama_tbs'"),
    client.execute("SELECT name FROM pragma_table_info('modal_peron') WHERE name = 'is_saldo_awal'"),
  ])
  let sql = readFileSync(resolve('drizzle/0004_tarif_peron_integrity.sql'), 'utf8')
  if (pembelianColumns.rows.length > 0) {
    sql = sql.replace('ALTER TABLE `pembelian` ADD COLUMN `brdl_sama_tbs` integer;', '')
  }
  if (modalColumns.rows.length > 0) {
    sql = sql.replace('ALTER TABLE `modal_peron` ADD COLUMN `is_saldo_awal` integer DEFAULT 0 NOT NULL;', '')
  }
  sql = sql.replaceAll('--> statement-breakpoint', '')
  if (!apply) {
    console.log('Dry-run lulus: owner tersedia, ref kas unik, SQL siap. Tambahkan --apply untuk menjalankan.')
    return
  }

  await client.executeMultiple(sql)
  const [tarif, indexes] = await Promise.all([
    client.execute("SELECT count(*) AS n FROM tarif_peron WHERE tanggal_berlaku = '2026-08-15'"),
    client.execute("SELECT count(*) AS n FROM sqlite_master WHERE type = 'index' AND name IN ('tarif_peron_peron_tanggal_idx','kas_ref_unique_idx','pembelian_tanggal_created_idx')"),
  ])
  console.log(`Migrasi berhasil: ${Number(tarif.rows[0]?.n ?? 0)} tarif awal, ${Number(indexes.rows[0]?.n ?? 0)}/3 indeks kunci terverifikasi.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
