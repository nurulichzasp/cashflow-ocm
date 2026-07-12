/**
 * Migrasi data SEKALI-JALAN (idempotent): peron "Umum" → kelebihan peron 30/kg.
 *
 * Model harga (lib/harga.ts): kelebihan peron = SELISIH_JUAL_BGA(120) − keuntunganPerKg.
 * "Umum" adalah SATU peron biasa (nama='Umum', kode 7) — bukan kategori. Aturannya
 * dinyatakan lewat keuntunganPerKg-nya, sama seperti peron lain:
 *
 *   keuntunganPerKg 90  →  kelebihan = 120 − 90 = 30  →  untung CV ter-floor ≥ 90/kg
 *
 * Karena 30 ≤ cap brondolan (CAP_KEUNTUNGAN_PERON=50), kelebihan jadi 30 SERAGAM untuk
 * TBS maupun semua brondolan (cap tak pernah mengikat). Sebelumnya 70 → kelebihan 50.
 *
 * HANYA menyentuh baris nama='Umum'. Peron lain TIDAK disentuh. Pembelian historis
 * TIDAK ditulis ulang (totalBeli/keuntungan tiap tiket sudah tersimpan; hanya entri
 * baru/perhitungan live yang memakai nilai ini). Aman dijalankan berulang.
 */
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import { eq } from 'drizzle-orm'
import * as schema from '../../lib/db/schema'

const UMUM_KEUNTUNGAN_PER_KG = 90 // → kelebihan 30 (120 − 90)

const db = drizzle({ connection: { url: process.env.TURSO_CONNECTION_URL!, authToken: process.env.TURSO_AUTH_TOKEN }, schema })

async function main() {
  const umum = await db.query.peron.findFirst({ where: (t, { eq }) => eq(t.nama, 'Umum') })
  if (!umum) {
    console.log('⚠️  Peron "Umum" tidak ditemukan — tidak ada yang diubah.')
    return
  }
  const before = umum.keuntunganPerKg
  if (before === UMUM_KEUNTUNGAN_PER_KG) {
    console.log(`✓ Peron "Umum" sudah untung/kg=${before} (kelebihan ${120 - before}). Idempotent — dilewati.`)
    return
  }
  await db.update(schema.peron)
    .set({ keuntunganPerKg: UMUM_KEUNTUNGAN_PER_KG })
    .where(eq(schema.peron.id, umum.id))
  console.log(
    `✓ Peron "Umum": untung/kg ${before} → ${UMUM_KEUNTUNGAN_PER_KG} ` +
    `(kelebihan ${120 - before} → ${120 - UMUM_KEUNTUNGAN_PER_KG}/kg, semua produk).`,
  )
}
main().catch((e) => { console.error(e); process.exit(1) })
