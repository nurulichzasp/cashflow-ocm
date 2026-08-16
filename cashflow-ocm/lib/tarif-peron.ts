import 'server-only'

import { and, desc, eq, lte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tarifPeron } from '@/lib/db/schema'
import { SELISIH_JUAL_BGA } from '@/lib/harga'

export async function getTarifPeronBerlaku(
  peronId: string,
  tanggal: string,
  keuntunganDefault: number,
) {
  const [row] = await db
    .select()
    .from(tarifPeron)
    .where(and(eq(tarifPeron.peronId, peronId), lte(tarifPeron.tanggalBerlaku, tanggal)))
    .orderBy(desc(tarifPeron.tanggalBerlaku), desc(tarifPeron.createdAt))
    .limit(1)

  if (!row) return { keuntunganPerKg: keuntunganDefault, brdlSamaTbs: false }
  return {
    keuntunganPerKg: SELISIH_JUAL_BGA - row.kelebihanPerKg,
    brdlSamaTbs: row.brdlSamaTbs,
  }
}
