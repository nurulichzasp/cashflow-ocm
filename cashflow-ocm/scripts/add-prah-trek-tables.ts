/**
 * Migrasi additif idempoten untuk modul Prah Trek (aset pribadi).
 * Tidak membuat relasi ke akun_kas, biaya_operasional, pembelian, atau laporan OCM.
 *
 * Jalankan: npx tsx scripts/add-prah-trek-tables.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@libsql/client'
import { pathToFileURL } from 'node:url'

const TABLES = ['prah_angkutan', 'prah_bbm'] as const

async function hasTable(client: ReturnType<typeof createClient>, table: string) {
  const result = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [table],
  })
  return result.rows.length > 0
}

async function hasColumn(client: ReturnType<typeof createClient>, table: string, column: string) {
  const result = await client.execute(`PRAGMA table_info(${table})`)
  return result.rows.some((row) => (row as Record<string, unknown>).name === column)
}

export async function migratePrahTrek(client: ReturnType<typeof createClient>) {
  await client.batch([
    `CREATE TABLE IF NOT EXISTS prah_angkutan (
      id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(8)))),
      tanggal TEXT NOT NULL,
      truk TEXT NOT NULL CHECK (truk IN ('katimin', 'doni')),
      peron_muat TEXT NOT NULL DEFAULT 'Nolin',
      no_bast TEXT,
      no_tid TEXT,
      sumber TEXT NOT NULL DEFAULT 'manual' CHECK (sumber IN ('manual', 'penjualan_bast', 'prah_bast')),
      penjualan_id TEXT REFERENCES penjualan(id) ON DELETE SET NULL,
      source_key TEXT,
      tonase_kotor REAL NOT NULL CHECK (tonase_kotor > 0 AND tonase_kotor <= 100000),
      tonase_netto_1 REAL NOT NULL CHECK (tonase_netto_1 > 0 AND tonase_netto_1 <= tonase_kotor),
      tarif_per_kg INTEGER NOT NULL DEFAULT 140 CHECK (tarif_per_kg >= 0),
      pendapatan INTEGER NOT NULL CHECK (
        pendapatan >= 0
        AND pendapatan = CAST(ROUND(tonase_kotor * tarif_per_kg) AS INTEGER)
      ),
      biaya_sopir INTEGER NOT NULL DEFAULT 200000 CHECK (biaya_sopir >= 0),
      catatan TEXT,
      created_by TEXT NOT NULL REFERENCES user(id),
      idempotency_key TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    'CREATE UNIQUE INDEX IF NOT EXISTS prah_angkutan_idempotency_idx ON prah_angkutan(idempotency_key)',
    'CREATE INDEX IF NOT EXISTS prah_angkutan_tanggal_created_idx ON prah_angkutan(tanggal, created_at)',
    'CREATE INDEX IF NOT EXISTS prah_angkutan_truk_tanggal_idx ON prah_angkutan(truk, tanggal)',
    'CREATE INDEX IF NOT EXISTS prah_angkutan_created_by_idx ON prah_angkutan(created_by)',
    `CREATE TABLE IF NOT EXISTS prah_bbm (
      id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(8)))),
      tanggal TEXT NOT NULL,
      truk TEXT NOT NULL CHECK (truk IN ('katimin', 'doni')),
      jumlah_ken INTEGER NOT NULL CHECK (jumlah_ken > 0 AND jumlah_ken <= 20),
      biaya_total INTEGER NOT NULL CHECK (biaya_total > 0),
      catatan TEXT,
      created_by TEXT NOT NULL REFERENCES user(id),
      idempotency_key TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    'CREATE UNIQUE INDEX IF NOT EXISTS prah_bbm_idempotency_idx ON prah_bbm(idempotency_key)',
    'CREATE INDEX IF NOT EXISTS prah_bbm_tanggal_created_idx ON prah_bbm(tanggal, created_at)',
    'CREATE INDEX IF NOT EXISTS prah_bbm_truk_tanggal_idx ON prah_bbm(truk, tanggal)',
    'CREATE INDEX IF NOT EXISTS prah_bbm_created_by_idx ON prah_bbm(created_by)',
  ], 'write')

  // Expand aman bila tabel sempat dibuat oleh versi awal fitur sebelum kolom ini ada.
  if (!await hasColumn(client, 'prah_angkutan', 'peron_muat')) {
    await client.execute("ALTER TABLE prah_angkutan ADD COLUMN peron_muat TEXT NOT NULL DEFAULT 'Nolin'")
  }
  const additiveColumns = [
    { name: 'no_bast', ddl: 'TEXT' },
    { name: 'no_tid', ddl: 'TEXT' },
    { name: 'sumber', ddl: "TEXT NOT NULL DEFAULT 'manual'" },
    { name: 'penjualan_id', ddl: 'TEXT REFERENCES penjualan(id) ON DELETE SET NULL' },
    { name: 'source_key', ddl: 'TEXT' },
  ]
  for (const column of additiveColumns) {
    if (!await hasColumn(client, 'prah_angkutan', column.name)) {
      await client.execute(`ALTER TABLE prah_angkutan ADD COLUMN ${column.name} ${column.ddl}`)
    }
  }
  await client.batch([
    'CREATE INDEX IF NOT EXISTS prah_angkutan_penjualan_idx ON prah_angkutan(penjualan_id)',
    'CREATE UNIQUE INDEX IF NOT EXISTS prah_angkutan_bast_source_idx ON prah_angkutan(no_bast, source_key)',
    // DROP + CREATE memperbarui definisi trigger dari versi migrasi sebelumnya.
    // Seluruh operasi berada dalam satu batch transaksi sehingga tidak ada jeda
    // saat tabel berjalan tanpa penjagaan integritas.
    'DROP TRIGGER IF EXISTS prah_angkutan_validate_insert',
    'DROP TRIGGER IF EXISTS prah_angkutan_validate_update',
    'DROP TRIGGER IF EXISTS prah_bbm_validate_insert',
    'DROP TRIGGER IF EXISTS prah_bbm_validate_update',
    `CREATE TRIGGER prah_angkutan_validate_insert
      BEFORE INSERT ON prah_angkutan
      WHEN NEW.truk NOT IN ('katimin', 'doni')
        OR NEW.sumber NOT IN ('manual', 'penjualan_bast', 'prah_bast')
        OR NEW.tonase_kotor <= 0 OR NEW.tonase_kotor > 100000
        OR NEW.tonase_netto_1 <= 0 OR NEW.tonase_netto_1 > NEW.tonase_kotor
        OR NEW.tarif_per_kg < 0 OR NEW.pendapatan < 0 OR NEW.biaya_sopir < 0
        OR NEW.pendapatan != CAST(ROUND(NEW.tonase_kotor * NEW.tarif_per_kg) AS INTEGER)
      BEGIN SELECT RAISE(ABORT, 'Data Prah tidak valid'); END`,
    `CREATE TRIGGER prah_angkutan_validate_update
      BEFORE UPDATE OF truk, sumber, tonase_kotor, tonase_netto_1, tarif_per_kg, pendapatan, biaya_sopir ON prah_angkutan
      WHEN NEW.truk NOT IN ('katimin', 'doni')
        OR NEW.sumber NOT IN ('manual', 'penjualan_bast', 'prah_bast')
        OR NEW.tonase_kotor <= 0 OR NEW.tonase_kotor > 100000
        OR NEW.tonase_netto_1 <= 0 OR NEW.tonase_netto_1 > NEW.tonase_kotor
        OR NEW.tarif_per_kg < 0 OR NEW.pendapatan < 0 OR NEW.biaya_sopir < 0
        OR NEW.pendapatan != CAST(ROUND(NEW.tonase_kotor * NEW.tarif_per_kg) AS INTEGER)
      BEGIN SELECT RAISE(ABORT, 'Data Prah tidak valid'); END`,
    `CREATE TRIGGER prah_bbm_validate_insert
      BEFORE INSERT ON prah_bbm
      WHEN NEW.truk NOT IN ('katimin', 'doni')
        OR NEW.jumlah_ken <= 0 OR NEW.jumlah_ken > 20 OR NEW.biaya_total <= 0
      BEGIN SELECT RAISE(ABORT, 'Data BBM Prah tidak valid'); END`,
    `CREATE TRIGGER prah_bbm_validate_update
      BEFORE UPDATE OF truk, jumlah_ken, biaya_total ON prah_bbm
      WHEN NEW.truk NOT IN ('katimin', 'doni')
        OR NEW.jumlah_ken <= 0 OR NEW.jumlah_ken > 20 OR NEW.biaya_total <= 0
      BEGIN SELECT RAISE(ABORT, 'Data BBM Prah tidak valid'); END`,
  ], 'write')

  let allOk = true
  for (const table of TABLES) {
    const ok = await hasTable(client, table)
    allOk &&= ok
    console.log(`  ${table}: ${ok ? 'OK' : 'MISSING'}`)
  }
  if (!allOk) throw new Error('Tabel Prah Trek gagal dibuat')
}

async function main() {
  const url = process.env.TURSO_CONNECTION_URL
  if (!url) throw new Error('TURSO_CONNECTION_URL tidak diset di .env.local')

  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })
  console.log(`Target DB: ${url.replace(/(libsql:\/\/[^.]*).*/, '$1…')}`)

  await migratePrahTrek(client)
  console.log('Migrasi Prah Trek selesai.')
}

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isDirectRun) {
  main().then(() => process.exit(0)).catch((error) => {
    console.error('GAGAL:', error)
    process.exit(1)
  })
}
