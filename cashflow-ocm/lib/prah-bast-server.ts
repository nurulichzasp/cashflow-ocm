import 'server-only'

import { z } from 'zod'
import { prahAngkutan } from '@/lib/db/schema'
import { isoDateSchema } from '@/lib/validation'
import { buildPrahBastSourceKeys, normalizeBastNumber } from '@/lib/bast-prah'
import { hitungPendapatanPrah, PRAH_BIAYA_SOPIR, PRAH_MAX_TONASE_KG, PRAH_TARIF_PER_KG } from '@/lib/prah-trek'

const rowSchema = z.object({
  tanggal: isoDateSchema,
  truk: z.enum(['katimin', 'doni']),
  noTid: z.string().trim().max(100).optional().default(''),
  tonaseKotor: z.coerce.number().positive('Tonase kotor BAST harus lebih dari 0').max(PRAH_MAX_TONASE_KG, `Tonase kotor maksimal ${PRAH_MAX_TONASE_KG} kg`),
  tonaseNetto1: z.coerce.number().positive('Netto 1 BAST harus lebih dari 0').max(PRAH_MAX_TONASE_KG, `Netto 1 maksimal ${PRAH_MAX_TONASE_KG} kg`),
}).refine((row) => row.tonaseNetto1 <= row.tonaseKotor, {
  message: 'Netto 1 BAST tidak boleh melebihi tonase kotor',
  path: ['tonaseNetto1'],
})

const rowsSchema = z.array(rowSchema).max(200, 'Maksimal 200 perjalanan per BAST')

export type ValidPrahBastRow = z.infer<typeof rowSchema>

export function parsePrahBastRowsJson(raw: FormDataEntryValue | null): ValidPrahBastRow[] {
  if (typeof raw !== 'string' || !raw.trim()) return []
  let candidate: unknown
  try {
    candidate = JSON.parse(raw)
  } catch {
    throw new Error('Data perjalanan BAST tidak valid')
  }
  return rowsSchema.parse(candidate)
}

export function buildPrahBastInserts(input: {
  rows: ValidPrahBastRow[]
  noBast: string
  peronMuat?: string
  sumber: 'penjualan_bast' | 'prah_bast'
  createdBy: string
  penjualanId?: string
}): Array<typeof prahAngkutan.$inferInsert> {
  const noBast = normalizeBastNumber(input.noBast)
  if (!noBast) throw new Error('No. BAST wajib diisi untuk memasukkan perjalanan ke Prah Trek')
  if (noBast.length > 150) throw new Error('No. BAST maksimal 150 karakter')
  const peronMuat = input.peronMuat?.trim() || 'Nolin'
  if (peronMuat.length > 100) throw new Error('Peron muat maksimal 100 karakter')
  const sourceKeys = buildPrahBastSourceKeys(input.rows.map((row) => ({
    ...row,
    noTid: row.noTid ?? '',
  })))

  return input.rows.map((row, index) => ({
    tanggal: row.tanggal,
    truk: row.truk,
    peronMuat,
    noBast,
    noTid: row.noTid?.trim().toUpperCase() || null,
    sumber: input.sumber,
    penjualanId: input.penjualanId ?? null,
    sourceKey: sourceKeys[index],
    tonaseKotor: row.tonaseKotor,
    tonaseNetto1: row.tonaseNetto1,
    tarifPerKg: PRAH_TARIF_PER_KG,
    pendapatan: hitungPendapatanPrah(row.tonaseKotor),
    biayaSopir: PRAH_BIAYA_SOPIR,
    catatan: `Otomatis dari BAST ${noBast}`,
    createdBy: input.createdBy,
    idempotencyKey: `prah-bast:${noBast}:${sourceKeys[index]}`,
  }))
}
