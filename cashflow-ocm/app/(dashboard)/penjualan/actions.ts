'use server'

import { revalidatePath } from 'next/cache'
import { eq, desc, gte, lte, sum, count, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { penjualan, penjualanDetail, transaksiKas, akunKas } from '@/lib/db/schema'
import { and } from 'drizzle-orm'
import { LIST_PAGE_SIZE } from '@/lib/pagination'
import { z } from 'zod'
import { notifyNewPenjualan } from '@/lib/notification'
import { requireModuleAction, requireModuleSession, requireOwner } from '@/lib/server-auth'
import { logActivity, describeActivity } from '@/lib/audit'
import { isoDateSchema, optionalIsoDateSchema } from '@/lib/validation'

const penjualanSchema = z.object({
  tanggal: isoDateSchema,
  noBast: z.string().optional(),
  noInvoice: z.string().optional(),
  statusBayar: z.enum(['belum', 'lunas']).default('belum'),
  tanggalBayarBga: optionalIsoDateSchema,
  // .int(): rupiah = bilangan bulat — jalur form sudah Math.round (parseRpInput),
  // ini menutup jalur programatik yang mengirim pecahan langsung.
  totalBersih: z.coerce.number().int('Rupiah harus bilangan bulat').positive('Total bersih harus positif').optional(),
  totalNilai: z.coerce.number().int('Rupiah harus bilangan bulat').positive('Total nilai harus positif').optional(),
  catatan: z.string().optional(),
})

function parseRpInput(v: FormDataEntryValue | null): number | undefined {
  if (!v) return undefined
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'))
  // W10: rupiah = bilangan bulat. Bulatkan agar tak ada pecahan masuk kolom integer.
  return isNaN(n) || n === 0 ? undefined : Math.round(n)
}

// Cari akun Rek BRI CV OCM (akun utama penerimaan BGA)
async function getAkunUtama() {
  const akun = await db.select().from(akunKas).orderBy(akunKas.urutan).limit(10)
  // Cari akun yang namanya mengandung "CV OCM" — rekening utama penerimaan BGA
  return akun.find(a => a.nama.toLowerCase().includes('cv ocm')) ?? akun[0]
}

export async function createPenjualan(formData: FormData) {
  const session = await requireModuleAction('penjualan', 'canCreate')

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
  const akunUtama = data.statusBayar === 'lunas' ? await getAkunUtama() : undefined
  if (data.statusBayar === 'lunas' && !data.totalNilai) throw new Error('Penjualan lunas wajib memiliki total nilai')
  if (data.statusBayar === 'lunas' && !akunUtama) throw new Error('Akun penerimaan utama belum tersedia. Buat akun kas terlebih dahulu.')

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
      if (akunUtama) {
        await tx.insert(transaksiKas).values({
          tanggal: data.tanggalBayarBga || data.tanggal,
          akunId: akunUtama.id,
          arah: 'masuk',
          jumlah: data.totalNilai,
          kategori: 'penerimaan_bga',
          refTabel: 'penjualan',
          refId: penjualanId,
          idempotencyKey: `penjualan:${penjualanId}`,
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
    await notifyNewPenjualan({
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
  const session = await requireModuleAction('penjualan', 'canEdit')

  // Baca data penjualan untuk tahu totalNilai
  const existing = await db.query.penjualan.findFirst({ where: (t, { eq }) => eq(t.id, id) })
  if (!existing) throw new Error('Penjualan tidak ditemukan')
  const tanggalBayar = tanggalBayarBga ? isoDateSchema.parse(tanggalBayarBga) : undefined
  const akunUtama = statusBayar === 'lunas' ? await getAkunUtama() : undefined
  if (statusBayar === 'lunas' && !existing.totalNilai) throw new Error('Penjualan lunas wajib memiliki total nilai')
  if (statusBayar === 'lunas' && !akunUtama) throw new Error('Akun penerimaan utama belum tersedia. Buat akun kas terlebih dahulu.')

  await db.transaction(async (tx) => {
    await tx.update(penjualan)
      .set({ statusBayar, tanggalBayarBga: tanggalBayar ?? null })
      .where(eq(penjualan.id, id))

    // Hapus transaksi kas lama terkait penjualan ini (jika ada)
    await tx.delete(transaksiKas).where(
      and(eq(transaksiKas.refTabel, 'penjualan'), eq(transaksiKas.refId, id))
    )

    // Jika statusBayar = lunas → buat transaksi kas masuk
    if (statusBayar === 'lunas' && existing.totalNilai) {
      if (akunUtama) {
        await tx.insert(transaksiKas).values({
          tanggal: tanggalBayar || existing.tanggal,
          akunId: akunUtama.id,
          arah: 'masuk',
          jumlah: existing.totalNilai,
          kategori: 'penerimaan_bga',
          refTabel: 'penjualan',
          refId: id,
          idempotencyKey: `penjualan:${id}`,
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
    newValues: { statusBayar, tanggalBayarBga: tanggalBayar ?? null },
  })

  revalidatePath('/penjualan')
  revalidatePath('/kas')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updatePenjualan(id: string, formData: FormData) {
  const session = await requireModuleAction('penjualan', 'canEdit')

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

  const existing = await db.query.penjualan.findFirst({ where: (t, { eq }) => eq(t.id, id) })
  if (!existing) throw new Error('Penjualan tidak ditemukan')
  const akunUtama = data.statusBayar === 'lunas' ? await getAkunUtama() : undefined
  if (data.statusBayar === 'lunas' && !data.totalNilai) throw new Error('Penjualan lunas wajib memiliki total nilai')
  if (data.statusBayar === 'lunas' && !akunUtama) throw new Error('Akun penerimaan utama belum tersedia. Buat akun kas terlebih dahulu.')

  await db.transaction(async (tx) => {
    await tx.update(penjualan).set({
      tanggal: data.tanggal,
      noBast: data.noBast ?? null,
      noInvoice: data.noInvoice ?? null,
      statusBayar: data.statusBayar,
      tanggalBayarBga: data.tanggalBayarBga ?? null,
      totalBersih: data.totalBersih ?? null,
      totalNilai: data.totalNilai ?? null,
      catatan: data.catatan ?? null,
    }).where(eq(penjualan.id, id))

    // Sinkronkan kas: hapus mutasi lama, buat ulang jika lunas
    await tx.delete(transaksiKas).where(and(eq(transaksiKas.refTabel, 'penjualan'), eq(transaksiKas.refId, id)))
    if (data.statusBayar === 'lunas' && data.totalNilai) {
      if (akunUtama) {
        await tx.insert(transaksiKas).values({
          tanggal: data.tanggalBayarBga || data.tanggal,
          akunId: akunUtama.id,
          arah: 'masuk',
          jumlah: data.totalNilai,
          kategori: 'penerimaan_bga',
          refTabel: 'penjualan',
          refId: id,
          idempotencyKey: `penjualan:${id}`,
          catatan: `Penerimaan BGA${data.noInvoice ? ` inv ${data.noInvoice}` : ''}`,
          createdBy: session.user.id,
        })
      }
    }
  })

  await logActivity({
    userId: session.user.id,
    action: 'update',
    entityType: 'penjualan',
    entityId: id,
    description: describeActivity('update', 'penjualan', `${data.noInvoice ?? data.noBast ?? '-'} • Rp${data.totalBersih ?? 0}`),
    oldValues: { tanggal: existing.tanggal, noInvoice: existing.noInvoice, totalBersih: existing.totalBersih, totalNilai: existing.totalNilai, statusBayar: existing.statusBayar, tanggalBayarBga: existing.tanggalBayarBga, catatan: existing.catatan },
    newValues: { tanggal: data.tanggal, noInvoice: data.noInvoice, totalBersih: data.totalBersih, totalNilai: data.totalNilai, statusBayar: data.statusBayar, tanggalBayarBga: data.tanggalBayarBga ?? null, catatan: data.catatan },
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
    await tx.delete(penjualanDetail).where(eq(penjualanDetail.penjualanId, id))
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

// Paginasi window (pola Kas): tanpa filter → hanya LIST_PAGE_SIZE baris terbaru
// (offset utk "Muat lebih banyak"); dengan filter tanggal → SEMUA baris rentang
// itu (bounded), supaya ringkasan/agregat klien atas rentang tetap persis benar.
export async function getPenjualanList(opts?: {
  dari?: string
  sampai?: string
  offset?: number
  limit?: number
}) {
  await requireModuleSession('penjualan')
  const { dari, sampai, offset, limit } = opts ?? {}
  const ranged = Boolean(dari || sampai)
  const conds = [
    ...(dari ? [gte(penjualan.tanggal, dari)] : []),
    ...(sampai ? [lte(penjualan.tanggal, sampai)] : []),
  ]
  const base = db
    .select()
    .from(penjualan)
    .where(ranged ? and(...conds) : undefined)
    .orderBy(desc(penjualan.tanggal), desc(penjualan.createdAt))
  if (ranged) return base
  return base.limit(limit ?? LIST_PAGE_SIZE).offset(offset ?? 0)
}

// Agregat all-time via SQL (bukan dari window baris yang dimuat klien).
// totalPpn mereplikasi persis logika hero tabel: per baris, selisih
// (totalNilai − totalBersih) HANYA bila nilai > bersih (null dianggap 0).
export async function getPenjualanStats() {
  await requireModuleSession('penjualan')
  const [row] = await db
    .select({
      totalCount: count(),
      totalPenjualan: sum(penjualan.totalBersih),
      totalPpn: sql<string | null>`sum(case when coalesce(${penjualan.totalNilai}, 0) > coalesce(${penjualan.totalBersih}, 0) then coalesce(${penjualan.totalNilai}, 0) - coalesce(${penjualan.totalBersih}, 0) else 0 end)`,
    })
    .from(penjualan)
  return {
    totalCount: row?.totalCount ?? 0,
    totalPenjualan: Number(row?.totalPenjualan ?? 0),
    totalPpn: Number(row?.totalPpn ?? 0),
  }
}
