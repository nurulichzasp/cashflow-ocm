import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from '../lib/db/schema'
import { eq } from 'drizzle-orm'

const db = drizzle({ connection: { url: process.env.TURSO_CONNECTION_URL!, authToken: process.env.TURSO_AUTH_TOKEN }, schema })

const KATEGORI_MAP: Record<string, string> = {
  'RING 1': 'OCM R1',
  'RING 2': 'OCM R2',
  'BRDL': 'OCM BRDL',
}

async function main() {
  const allPembelian = await db.query.pembelian.findMany({ with: { details: true } })
  console.log(`Found ${allPembelian.length} pembelian records`)

  for (const p of allPembelian) {
    // Migrate kategori
    const newKategori = KATEGORI_MAP[p.kategori as string] as typeof p.kategori | undefined
    if (newKategori) {
      await db.update(schema.pembelian)
        .set({ kategori: newKategori })
        .where(eq(schema.pembelian.id, p.id))
      console.log(`  Migrated kategori ${p.id}: ${p.kategori} → ${newKategori}`)
    }

    // Create detail row if none exists (legacy single-TID data)
    if (p.details.length === 0 && p.tonase > 0) {
      const hargaLapangan = p.hargaBeli ?? p.hargaJual
      await db.insert(schema.pembelianDetail).values({
        pembelianId: p.id,
        noTid: p.noTid ?? null,
        nopol: p.nopol ?? null,
        supir: p.supir ?? null,
        tonase: p.tonase,
        hargaLapangan,
        subtotalBeli: p.totalBeli,
        subtotalJual: p.totalJual,
        keuntungan: p.keuntungan,
        urutan: 0,
      })
      console.log(`  Created detail for pembelian ${p.id} (tonase: ${p.tonase}, harga: ${hargaLapangan})`)
    }
  }

  console.log('✅ Migration selesai')
}

main().catch((e) => { console.error(e); process.exit(1) })
