'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { penjualan, transaksiKas, akunKas } from '@/lib/db/schema'
import { and } from 'drizzle-orm'
import { z } from 'zod'
import { notifyNewPenjualan } from '@/lib/notification'
import { requirePermission } from '@/lib/permissions'
import { logActivity, describeActivity } from '@/lib/audit'

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Tidak terautentikasi')
  return session
}

async function requireOwner() {
  const session = await requireSession()
  if (session.user.role !== 'owner') throw new Error('Hanya owner yang dapat melakukan aksi ini')
  return session
}

const penjualanSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  noBast: z.string().optional(),
  noInvoice: z.string().optional(),
  statusBayar: z.enum(['belum', 'lunas']).default('belum'),
  tanggalBayarBga: z.string().optional(),
  totalBersih: z.coerce.number().positive('Total bersih harus positif').optional(),
  totalNilai: z.coerce.number().positive('Total nilai harus positif').optional(),
  catatan: z.string().optional(),
})

function parseRpInput(v: FormDataEntryValue | null): number | undefined {
  if (!v) return undefined
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'))
  return isNaN(n) || n === 0 ? undefined : n
}

// Cari akun Rek BRI CV OCM (akun utama penerimaan BGA)
async function getAkunUtama() {
  const akun = await db.select().from(akunKas).orderBy(akunKas.urutan).limit(10)
  // Cari akun yang namanya mengandung "CV OCM" — rekening utama penerimaan BGA
  return akun.find(a => a.nama.toLowerCase().includes('cv ocm')) ?? akun[0]
}

export async function createPenjualan(formData: FormData) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canCreate')

  const data = penjualanSchema.parse({
    tanggal: formData.get('tanggal'),
    noBast: formData.get('noBast') || undefined,
    noInvoice: formData.get('noInvoice') || undefined,
    statusBayar: formData.get('statusBayar'),
    tanggalBayarBga: formData.get('tanggalBayarBga') || undefined,
    totalBersih: parseRpInput(formData.get('totalBersih')),
    totalNilai: parseRpInput(formData.get('totalNilai')),
    catatan: formData.get('catatan') || undefined,
  })
  const idempotencyKey = formData.get('idempotencyKey')?.toString() || undefined

  // Anti-dobel: tolak penjualan identik (jumlah & status sama) dari user yang sama
  // dalam ~60 detik terakhir (double-submit / retry sinyal jelek).
  const recentCutoff = new Date(Date.now() - 60_000)
  const recents = await db.query.penjualan.findMany({
    where: (t, { and, eq, gte }) => and(
      eq(t.createdBy, session.user.id),
      eq(t.tanggal, data.tanggal),
      gte(t.createdAt, recentCutoff),
    ),
  })
  const isDup = recents.some(
    (r) => (r.totalBersih ?? 0) === (data.totalBersih ?? 0) && (r.totalNilai ?? 0) === (data.totalNilai ?? 0) && r.statusBayar === data.statusBayar
  )
  if (isDup) throw new Error('Penjualan identik baru saja tercatat (~1 menit lalu). Bila berbeda, ubah sedikit lalu simpan lagi.')

  // Atomic: catat penjualan + mutasi kas (jika lunas) dalam satu transaksi
  const newId = await db.transaction(async (tx) => {
    const inserted = await tx.insert(penjualan).values({
      ...data,
      createdBy: session.user.id,
      idempotencyKey,
    }).onConflictDoNothing({ target: penjualan.idempotencyKey }).returning()
    if (inserted.length === 0) throw new Error('Penjualan ini sudah tercatat (pengiriman ganda terdeteksi). Cek daftar, jangan input ulang.')
    const penjualanId = inserted[0].id

    // Jika langsung lunas → catat uang masuk ke Rek BRI CV OCM
    // Jumlah = totalNilai (total yang dibayar BGA, termasuk PPN−PPH)
    if (data.statusBayar === 'lunas' && data.totalNilai) {
      const akunUtama = await getAkunUtama()
      if (akunUtama) {
        await tx.insert(transaksiKas).values({
          tanggal: data.tanggalBayarBga || data.tanggal,
          akunId: akunUtama.id,
          arah: 'masuk',
          jumlah: data.totalNilai,
          kategori: 'penerimaan_bga',
          refTabel: 'penjualan',
          refId: penjualanId,
          catatan: `Penerimaan BGA${data.noInvoice ? ` inv ${data.noInvoice}` : ''}`,
          createdBy: session.user.id,
        })
      }
    }
    return penjualanId
  })

  await logActivity({
    userId: session.user.id,
    action: 'create',
    entityType: 'penjualan',
    entityId: newId,
    description: describeActivity('create', 'penjualan', `${data.noInvoice ?? data.noBast ?? '-'} • Rp${data.totalBersih ?? 0}`),
    newValues: { tanggal: data.tanggal, noInvoice: data.noInvoice, totalBersih: data.totalBersih, totalNilai: data.totalNilai, statusBayar: data.statusBayar },
  })

  // Trigger Telegram Notification
  try {
    notifyNewPenjualan({
      tanggal: data.tanggal,
      noInvoice: data.noInvoice,
      noBast: data.noBast,
      totalBersih: data.totalBersih,
      totalNilai: data.totalNilai,
      statusBayar: data.statusBayar,
      catatan: data.catatan,
      createdByName: session.user.name,
      createdByRole: session.user.role,
    })
  } catch (err) {
    console.error('Failed to trigger Telegram notification for Penjualan:', err)
  }

  revalidatePath('/penjualan')
  revalidatePath('/kas')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updatePenjualanStatus(id: string, statusBayar: 'belum' | 'lunas', tanggalBayarBga?: string) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canEdit')

  // Baca data penjualan untuk tahu totalNilai
  const existing = await db.query.penjualan.findFirst({ where: (t, { eq }) => eq(t.id, id) })
  if (!existing) throw new Error('Penjualan tidak ditemukan')

  await db.transaction(async (tx) => {
    await tx.update(penjualan)
      .set({ statusBayar, tanggalBayarBga: tanggalBayarBga ?? null })
      .where(eq(penjualan.id, id))

    // Hapus transaksi kas lama terkait penjualan ini (jika ada)
    await tx.delete(transaksiKas).where(
      and(eq(transaksiKas.refTabel, 'penjualan'), eq(transaksiKas.refId, id))
    )

    // Jika statusBayar = lunas → buat transaksi kas masuk
    if (statusBayar === 'lunas' && existing.totalNilai) {
      const akunUtama = await getAkunUtama()
      if (akunUtama) {
        await tx.insert(transaksiKas).values({
          tanggal: tanggalBayarBga || existing.tanggal,
          akunId: akunUtama.id,
          arah: 'masuk',
          jumlah: existing.totalNilai,
          kategori: 'penerimaan_bga',
          refTabel: 'penjualan',
          refId: id,
          catatan: `Penerimaan BGA${existing.noInvoice ? ` inv ${existing.noInvoice}` : ''}`,
          createdBy: session.user.id,
        })
      }
    }
    // Jika belum → kas terkait sudah dihapus di atas
  })

  await logActivity({
    userId: session.user.id,
    action: 'update',
    entityType: 'penjualan',
    entityId: id,
    description: describeActivity('update', 'penjualan', `status → ${statusBayar}${existing.noInvoice ? ` (inv ${existing.noInvoice})` : ''}`),
    oldValues: { statusBayar: existing.statusBayar, tanggalBayarBga: existing.tanggalBayarBga },
    newValues: { statusBayar, tanggalBayarBga: tanggalBayarBga ?? null },
  })

  revalidatePath('/penjualan')
  revalidatePath('/kas')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deletePenjualan(id: string) {
  const session = await requireOwner()

  const existing = await db.query.penjualan.findFirst({ where: (t, { eq }) => eq(t.id, id) })

  await db.transaction(async (tx) => {
    await tx.delete(transaksiKas).where(and(eq(transaksiKas.refTabel, 'penjualan'), eq(transaksiKas.refId, id)))
    await tx.delete(penjualan).where(eq(penjualan.id, id))
  })

  await logActivity({
    userId: session.user.id,
    action: 'delete',
    entityType: 'penjualan',
    entityId: id,
    description: describeActivity('delete', 'penjualan', existing ? `${existing.noInvoice ?? existing.noBast ?? '-'} • Rp${existing.totalBersih ?? 0}` : id),
    oldValues: existing
      ? { tanggal: existing.tanggal, noInvoice: existing.noInvoice, totalBersih: existing.totalBersih, totalNilai: existing.totalNilai, statusBayar: existing.statusBayar }
      : undefined,
  })

  revalidatePath('/penjualan')
  revalidatePath('/kas')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getPenjualanList() {
  return db
    .select()
    .from(penjualan)
    .orderBy(desc(penjualan.tanggal), desc(penjualan.createdAt))
}
