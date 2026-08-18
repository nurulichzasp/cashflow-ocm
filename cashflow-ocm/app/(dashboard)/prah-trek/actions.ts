'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { prahAngkutan, prahBbm } from '@/lib/db/schema'
import { logActivity, describeActivity } from '@/lib/audit'
import { requireOwner } from '@/lib/server-auth'
import { isoDateSchema } from '@/lib/validation'
import { hitungPendapatanPrah, PRAH_BIAYA_SOPIR, PRAH_MAX_TONASE_KG, PRAH_TARIF_PER_KG } from '@/lib/prah-trek'
import { buildPrahBastInserts, parsePrahBastRowsJson } from '@/lib/prah-bast-server'
import { normalizeBastNumber } from '@/lib/bast-prah'

const trukSchema = z.enum(['katimin', 'doni'])

const angkutanSchema = z.object({
  tanggal: isoDateSchema,
  truk: trukSchema,
  peronMuat: z.string().trim().min(1, 'Peron muat wajib diisi').max(100),
  tonaseKotor: z.coerce.number().positive('Tonase kotor harus lebih dari 0').max(PRAH_MAX_TONASE_KG, `Tonase kotor maksimal ${PRAH_MAX_TONASE_KG} kg`),
  tonaseNetto1: z.coerce.number().positive('Netto 1 harus lebih dari 0').max(PRAH_MAX_TONASE_KG, `Netto 1 maksimal ${PRAH_MAX_TONASE_KG} kg`),
  catatan: z.string().trim().max(500).optional(),
}).refine((data) => data.tonaseNetto1 <= data.tonaseKotor, {
  message: 'Netto 1 tidak boleh melebihi tonase kotor',
  path: ['tonaseNetto1'],
})

const bbmSchema = z.object({
  tanggal: isoDateSchema,
  truk: trukSchema,
  jumlahKen: z.coerce.number().int().positive('Jumlah ken harus lebih dari 0').max(20),
  biayaTotal: z.coerce.number().int().positive('Biaya BBM harus lebih dari 0'),
  catatan: z.string().trim().max(500).optional(),
})

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export async function getPrahTrekData() {
  await requireOwner('Prah Trek adalah pembukuan aset pribadi dan hanya dapat dilihat owner')
  const [angkutan, bbm] = await Promise.all([
    db.query.prahAngkutan.findMany({
      orderBy: (t, { desc }) => [desc(t.tanggal), desc(t.createdAt)],
    }),
    db.query.prahBbm.findMany({
      orderBy: (t, { desc }) => [desc(t.tanggal), desc(t.createdAt)],
    }),
  ])
  return { angkutan, bbm }
}

export async function createPrahAngkutan(formData: FormData) {
  const session = await requireOwner()
  const data = angkutanSchema.parse({
    tanggal: formData.get('tanggal'),
    truk: formData.get('truk'),
    peronMuat: formData.get('peronMuat'),
    tonaseKotor: formData.get('tonaseKotor'),
    tonaseNetto1: formData.get('tonaseNetto1'),
    catatan: text(formData, 'catatan'),
  })
  const idempotencyKey = text(formData, 'idempotencyKey')
  const pendapatan = hitungPendapatanPrah(data.tonaseKotor)

  const inserted = await db.insert(prahAngkutan).values({
    ...data,
    tarifPerKg: PRAH_TARIF_PER_KG,
    pendapatan,
    biayaSopir: PRAH_BIAYA_SOPIR,
    catatan: data.catatan ?? null,
    createdBy: session.user.id,
    idempotencyKey,
  }).onConflictDoNothing({ target: prahAngkutan.idempotencyKey }).returning()

  if (!inserted[0]) throw new Error('Prah ini sudah tercatat. Cek daftar sebelum menginput ulang.')

  await logActivity({
    userId: session.user.id,
    action: 'create',
    entityType: 'prah_angkutan',
    entityId: inserted[0].id,
    description: describeActivity('create', 'prah_angkutan', `${data.truk} • ${data.tonaseKotor} kg`),
    newValues: inserted[0],
  })
  revalidatePath('/prah-trek')
  return { success: true }
}

export async function createPrahFromBast(formData: FormData) {
  const session = await requireOwner()
  const noBast = normalizeBastNumber(text(formData, 'noBast') ?? '')
  const peronMuat = text(formData, 'peronMuat') ?? 'Nolin'
  const rows = parsePrahBastRowsJson(formData.get('prahBastRows'))
  if (!noBast) throw new Error('No. BAST wajib diisi')
  if (rows.length === 0) throw new Error('Tambahkan minimal satu perjalanan Doni atau Katimin')

  const values = buildPrahBastInserts({
    rows,
    noBast,
    peronMuat,
    sumber: 'prah_bast',
    createdBy: session.user.id,
  })
  const inserted = await db.insert(prahAngkutan).values(values).onConflictDoNothing().returning({ id: prahAngkutan.id })

  await logActivity({
    userId: session.user.id,
    action: 'create',
    entityType: 'prah_angkutan',
    entityId: inserted[0]?.id,
    description: describeActivity('create', 'prah_angkutan', `BAST ${noBast} • ${inserted.length}/${rows.length} perjalanan`),
    newValues: { noBast, peronMuat, jumlahBaris: rows.length, berhasil: inserted.length },
  })
  revalidatePath('/prah-trek')
  return { success: true, inserted: inserted.length, skipped: rows.length - inserted.length }
}

export async function updatePrahAngkutan(id: string, formData: FormData) {
  const session = await requireOwner()
  const data = angkutanSchema.parse({
    tanggal: formData.get('tanggal'),
    truk: formData.get('truk'),
    peronMuat: formData.get('peronMuat'),
    tonaseKotor: formData.get('tonaseKotor'),
    tonaseNetto1: formData.get('tonaseNetto1'),
    catatan: text(formData, 'catatan'),
  })
  const existing = await db.query.prahAngkutan.findFirst({ where: (t, { eq }) => eq(t.id, id) })
  if (!existing) throw new Error('Catatan prah tidak ditemukan')

  const next = {
    ...data,
    tarifPerKg: existing.tarifPerKg,
    pendapatan: hitungPendapatanPrah(data.tonaseKotor, existing.tarifPerKg),
    biayaSopir: existing.biayaSopir,
    catatan: data.catatan ?? null,
  }
  await db.update(prahAngkutan).set(next).where(eq(prahAngkutan.id, id))
  await logActivity({
    userId: session.user.id,
    action: 'update',
    entityType: 'prah_angkutan',
    entityId: id,
    description: describeActivity('update', 'prah_angkutan', `${data.truk} • ${data.tonaseKotor} kg`),
    oldValues: existing,
    newValues: next,
  })
  revalidatePath('/prah-trek')
  return { success: true }
}

export async function deletePrahAngkutan(id: string) {
  const session = await requireOwner()
  const existing = await db.query.prahAngkutan.findFirst({ where: (t, { eq }) => eq(t.id, id) })
  if (!existing) throw new Error('Catatan prah tidak ditemukan')
  await db.delete(prahAngkutan).where(eq(prahAngkutan.id, id))
  await logActivity({
    userId: session.user.id,
    action: 'delete',
    entityType: 'prah_angkutan',
    entityId: id,
    description: describeActivity('delete', 'prah_angkutan', `${existing.truk} • ${existing.tonaseKotor} kg`),
    oldValues: existing,
  })
  revalidatePath('/prah-trek')
  return { success: true }
}

export async function createPrahBbm(formData: FormData) {
  const session = await requireOwner()
  const data = bbmSchema.parse({
    tanggal: formData.get('tanggal'),
    truk: formData.get('truk'),
    jumlahKen: formData.get('jumlahKen'),
    biayaTotal: formData.get('biayaTotal'),
    catatan: text(formData, 'catatan'),
  })
  const inserted = await db.insert(prahBbm).values({
    ...data,
    catatan: data.catatan ?? null,
    createdBy: session.user.id,
    idempotencyKey: text(formData, 'idempotencyKey'),
  }).onConflictDoNothing({ target: prahBbm.idempotencyKey }).returning()
  if (!inserted[0]) throw new Error('Pengisian BBM ini sudah tercatat. Cek daftar sebelum menginput ulang.')

  await logActivity({
    userId: session.user.id,
    action: 'create',
    entityType: 'prah_bbm',
    entityId: inserted[0].id,
    description: describeActivity('create', 'prah_bbm', `${data.truk} • ${data.jumlahKen} ken`),
    newValues: inserted[0],
  })
  revalidatePath('/prah-trek')
  return { success: true }
}

export async function updatePrahBbm(id: string, formData: FormData) {
  const session = await requireOwner()
  const data = bbmSchema.parse({
    tanggal: formData.get('tanggal'),
    truk: formData.get('truk'),
    jumlahKen: formData.get('jumlahKen'),
    biayaTotal: formData.get('biayaTotal'),
    catatan: text(formData, 'catatan'),
  })
  const existing = await db.query.prahBbm.findFirst({ where: (t, { eq }) => eq(t.id, id) })
  if (!existing) throw new Error('Catatan BBM tidak ditemukan')
  const next = { ...data, catatan: data.catatan ?? null }
  await db.update(prahBbm).set(next).where(eq(prahBbm.id, id))
  await logActivity({
    userId: session.user.id,
    action: 'update',
    entityType: 'prah_bbm',
    entityId: id,
    description: describeActivity('update', 'prah_bbm', `${data.truk} • ${data.jumlahKen} ken`),
    oldValues: existing,
    newValues: next,
  })
  revalidatePath('/prah-trek')
  return { success: true }
}

export async function deletePrahBbm(id: string) {
  const session = await requireOwner()
  const existing = await db.query.prahBbm.findFirst({ where: (t, { eq }) => eq(t.id, id) })
  if (!existing) throw new Error('Catatan BBM tidak ditemukan')
  await db.delete(prahBbm).where(eq(prahBbm.id, id))
  await logActivity({
    userId: session.user.id,
    action: 'delete',
    entityType: 'prah_bbm',
    entityId: id,
    description: describeActivity('delete', 'prah_bbm', `${existing.truk} • ${existing.jumlahKen} ken`),
    oldValues: existing,
  })
  revalidatePath('/prah-trek')
  return { success: true }
}
