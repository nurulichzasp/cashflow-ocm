import { afterEach, describe, expect, it } from 'vitest'
import { createClient, type Client } from '@libsql/client'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { migratePrahTrek } from '../../scripts/add-prah-trek-tables'

const cleanupDirs: string[] = []

async function tempClient(): Promise<Client> {
  const dir = await mkdtemp(join(tmpdir(), 'prah-migration-'))
  cleanupDirs.push(dir)
  return createClient({ url: `file:${join(dir, 'test.db')}` })
}

async function createParentTables(client: Client) {
  await client.batch([
    'CREATE TABLE user (id TEXT PRIMARY KEY NOT NULL)',
    'CREATE TABLE penjualan (id TEXT PRIMARY KEY NOT NULL)',
    "INSERT INTO user (id) VALUES ('owner-1')",
    "INSERT INTO penjualan (id) VALUES ('penjualan-1')",
  ], 'write')
}

async function insertValidPrah(client: Client) {
  await client.execute(`
    INSERT INTO prah_angkutan (
      tanggal, truk, peron_muat, sumber, penjualan_id,
      tonase_kotor, tonase_netto_1, tarif_per_kg, pendapatan,
      biaya_sopir, created_by
    ) VALUES (
      '2026-08-17', 'doni', 'Nolin', 'penjualan_bast', 'penjualan-1',
      10000, 9000, 140, 1400000,
      200000, 'owner-1'
    )
  `)
}

afterEach(async () => {
  await Promise.all(cleanupDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('migrasi Prah Trek', () => {
  it('idempoten dan menjaga constraint pada database baru', async () => {
    const client = await tempClient()
    await createParentTables(client)

    await migratePrahTrek(client)
    await migratePrahTrek(client)
    await insertValidPrah(client)

    await expect(client.execute(`
      INSERT INTO prah_angkutan (
        tanggal, truk, peron_muat, sumber, tonase_kotor, tonase_netto_1,
        tarif_per_kg, pendapatan, biaya_sopir, created_by
      ) VALUES (
        '2026-08-17', 'doni', 'Nolin', 'invalid', 10000, 9000,
        140, 1400000, 200000, 'owner-1'
      )
    `)).rejects.toThrow()

    await expect(client.execute(`
      UPDATE prah_angkutan SET pendapatan = 1
    `)).rejects.toThrow()

    await expect(client.execute(`
      INSERT INTO prah_bbm (
        tanggal, truk, jumlah_ken, biaya_total, created_by
      ) VALUES ('2026-08-17', 'doni', 0, 500000, 'owner-1')
    `)).rejects.toThrow()

    await expect(client.execute(`
      INSERT INTO prah_bbm (
        tanggal, truk, jumlah_ken, biaya_total, created_by
      ) VALUES ('2026-08-17', 'doni', 21, 500000, 'owner-1')
    `)).rejects.toThrow()

    await client.execute("DELETE FROM penjualan WHERE id = 'penjualan-1'")
    const detached = await client.execute('SELECT penjualan_id FROM prah_angkutan')
    expect(detached.rows[0]?.penjualan_id).toBeNull()
    expect((await client.execute('PRAGMA foreign_key_check')).rows).toEqual([])
  })

  it('menambahkan trigger integritas pada tabel versi lama yang tidak punya CHECK lengkap', async () => {
    const client = await tempClient()
    await createParentTables(client)
    await client.batch([
      `CREATE TABLE prah_angkutan (
        id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(8)))),
        tanggal TEXT NOT NULL,
        truk TEXT NOT NULL,
        tonase_kotor REAL NOT NULL,
        tonase_netto_1 REAL NOT NULL,
        tarif_per_kg INTEGER NOT NULL DEFAULT 140,
        pendapatan INTEGER NOT NULL,
        biaya_sopir INTEGER NOT NULL DEFAULT 200000,
        catatan TEXT,
        created_by TEXT NOT NULL REFERENCES user(id),
        idempotency_key TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`,
      `CREATE TABLE prah_bbm (
        id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(8)))),
        tanggal TEXT NOT NULL,
        truk TEXT NOT NULL,
        jumlah_ken INTEGER NOT NULL,
        biaya_total INTEGER NOT NULL,
        catatan TEXT,
        created_by TEXT NOT NULL REFERENCES user(id),
        idempotency_key TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`,
    ], 'write')

    await migratePrahTrek(client)
    await insertValidPrah(client)

    await expect(client.execute("UPDATE prah_angkutan SET sumber = 'invalid'"))
      .rejects.toThrow('Data Prah tidak valid')
    await expect(client.execute('UPDATE prah_angkutan SET pendapatan = 1399999'))
      .rejects.toThrow('Data Prah tidak valid')
    await expect(client.execute(`
      INSERT INTO prah_bbm (
        tanggal, truk, jumlah_ken, biaya_total, created_by
      ) VALUES ('2026-08-17', 'doni', -1, 500000, 'owner-1')
    `)).rejects.toThrow('Data BBM Prah tidak valid')
  })
})
