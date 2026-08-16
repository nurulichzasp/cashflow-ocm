'use server'

import { revalidatePath } from 'next/cache'
import { eq, sum, count } from 'drizzle-orm'
import { db } from '@/lib/db'
import { transaksiKas, akunKas } from '@/lib/db/schema'
import { LIST_PAGE_SIZE } from '@/lib/pagination'
import { z } from 'zod'
import { requireModuleAction, requireModuleSession, requireOwner } from '@/lib/server-auth'
import { logActivity, describeActivity } from '@/lib/audit'
import { isoDateSchema } from '@/lib/validation'

// Kategori yang WAJAR untuk entri kas MANUAL. Kategori lain — penerimaan_bga,
// bayar_peron, modal_peron, kembali_modal, biaya_operasional — HANYA dibuat
// otomatis oleh modul induk (penjualan/pembelian/biaya/modal) dengan refTabel;
// membuatnya manual = dobel-hitung/rekonsiliasi bocor. Dipakai sebagai gerbang
// server-side (bukan cuma UI).
// TIDAK di-export: file 'use server' hanya boleh meng-export async function
// (form kas memegang salinan daftar ini sendiri).
const KATEGORI_KAS_MANUAL = ['tarik_bri', 'penyesuaian', 'lainnya'] as const

const kasSchema = z.object({
  tanggal: isoDateSchema,
  akunId: z.string().min(1, 'Akun wajib dipilih'),
  arah: z.enum(['masuk', 'keluar']),
  jumlah: z.coerce.number().int().positive('Jumlah harus positif'),
  kategori: z.enum([
    'penerimaan_bga',
    'tarik_bri',
    'bayar_peron',
    'modal_peron',
    'kembali_modal',
    'biaya_operasional',
    'penyesuaian',
    'lainnya',
  ]),
  catatan: z.string().optional(),
  // R1: refTabel/refId SENGAJA tidak diterima dari input manual. Entri kas
  // otomatis (punya refTabel) hanya dibuat oleh action induk pembelian/penjualan/
  // biaya/modal di dalam transaksinya — bukan lewat form kas manual ini.
})

// Entri BARU dibatasi ke kategori manual saja (validasi server-side, defense-in-depth
// — UI bukan satu-satunya gerbang). Update tetap pakai kasSchema penuh agar entri
// LAMA berkategori apa pun tetap bisa diedit (lihat guard di updateTransaksiKas).
const kasCreateSchema = kasSchema.extend({
  kategori: z.enum(KATEGORI_KAS_MANUAL),
})

export async function createTransaksiKas(formData: FormData) {
  const session = await requireModuleAction('kas', 'canCreate')

  const data = kasCreateSchema.parse({
    tanggal: formData.get('tanggal'),
    akunId: formData.get('akunId'),
    arah: formData.get('arah'),
    jumlah: formData.get('jumlah'),
    kategori: formData.get('kategori'),
    catatan: formData.get('catatan') || undefined,
  })
  const akun = await db.select({ id: akunKas.id }).from(akunKas).where(eq(akunKas.id, data.akunId)).limit(1)
  if (!akun[0]) throw new Error('Akun kas tidak ditemukan')

  // Anti-dobel: tolak transaksi kas manual identik dari user yang sama dalam ~60 detik.
  const recentCutoff = new Date(Date.now() - 60_000)
  const dup = await db.query.transaksiKas.findFirst({
    where: (t, { and, eq, gte }) => and(
      eq(t.createdBy, session.user.id),
      eq(t.tanggal, data.tanggal),
      eq(t.akunId, data.akunId),
      eq(t.arah, data.arah),
      eq(t.jumlah, data.jumlah),
      eq(t.kategori, data.kategori),
      gte(t.createdAt, recentCutoff),
    ),
  })
  if (dup) throw new Error('Transaksi kas identik baru saja tercatat (~1 menit lalu). Bila berbeda, ubah sedikit (mis. catatan) lalu simpan lagi.')

  const inserted = await db.insert(transaksiKas).values({
    ...data,
    createdBy: session.user.id,
    idempotencyKey: formData.get('idempotencyKey')?.toString() || undefined,
  }).onConflictDoNothing({ target: transaksiKas.idempotencyKey }).returning()
  if (inserted.length === 0) throw new Error('Transaksi kas ini sudah tercatat (pengiriman ganda terdeteksi). Cek daftar, jangan input ulang.')

  await logActivity({
    userId: session.user.id,
    action: 'create',
    entityType: 'transaksi_kas',
    entityId: inserted[0]?.id,
    description: describeActivity('create', 'transaksi_kas', `${data.arah} ${data.kategori} • Rp${data.jumlah}`),
    newValues: { tanggal: data.tanggal, akunId: data.akunId, arah: data.arah, jumlah: data.jumlah, kategori: data.kategori },
  })

  revalidatePath('/kas')
  return { success: true }
}

export async function updateTransaksiKas(id: string, formData: FormData) {
  const session = await requireModuleAction('kas', 'canEdit')

  const existing = await db.query.transaksiKas.findFirst({ where: (t, { eq }) => eq(t.id, id) })
  if (!existing) throw new Error('Transaksi tidak ditemukan')

  // Guard: transaksi otomatis (dari penjualan/biaya) tidak boleh diedit di sini.
  if (existing.refTabel) {
    throw new Error('Transaksi ini otomatis dari penjualan/biaya — edit di catatan sumbernya.')
  }

  const data = kasSchema.parse({
    tanggal: formData.get('tanggal'),
    akunId: formData.get('akunId'),
    arah: formData.get('arah'),
    jumlah: formData.get('jumlah'),
    kategori: formData.get('kategori'),
    catatan: formData.get('catatan') || undefined,
  })
  const akun = await db.select({ id: akunKas.id }).from(akunKas).where(eq(akunKas.id, data.akunId)).limit(1)
  if (!akun[0]) throw new Error('Akun kas tidak ditemukan')

  // Boleh mempertahankan kategori LAMA (entri lawas mungkin sudah berlabel apa
  // pun), tapi TIDAK boleh MENGUBAH ke kategori otomatis — itu ranah sistem.
  const manual = (KATEGORI_KAS_MANUAL as readonly string[]).includes(data.kategori)
  if (!manual && data.kategori !== existing.kategori) {
    throw new Error('Kategori itu hanya untuk transaksi otomatis (dari penjualan/pembelian/biaya/modal). Pilih kategori manual.')
  }

  await db.update(transaksiKas).set({
    tanggal: data.tanggal,
    akunId: data.akunId,
    arah: data.arah,
    jumlah: data.jumlah,
    kategori: data.kategori,
    catatan: data.catatan ?? null,
  }).where(eq(transaksiKas.id, id))

  await logActivity({
    userId: session.user.id,
    action: 'update',
    entityType: 'transaksi_kas',
    entityId: id,
    description: describeActivity('update', 'transaksi_kas', `${data.arah} ${data.kategori} • Rp${data.jumlah}`),
    oldValues: { tanggal: existing.tanggal, akunId: existing.akunId, arah: existing.arah, jumlah: existing.jumlah, kategori: existing.kategori, catatan: existing.catatan },
    newValues: { tanggal: data.tanggal, akunId: data.akunId, arah: data.arah, jumlah: data.jumlah, kategori: data.kategori, catatan: data.catatan ?? null },
  })

  revalidatePath('/kas')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteTransaksiKas(id: string) {
  const session = await requireOwner()

  const existing = await db.query.transaksiKas.findFirst({ where: (t, { eq }) => eq(t.id, id) })
  // Guard (selaras updateTransaksiKas): baris kas OTOMATIS (dari pembelian/
  // penjualan/biaya) tak boleh dihapus manual di sini. Kalau dihapus, induknya
  // tetap 'lunas' tapi tanpa offset kas → gap rekonsiliasi. Hapus lewat sumbernya.
  if (existing?.refTabel) {
    throw new Error('Transaksi ini otomatis dari pembelian/penjualan/biaya — ubah di catatan sumbernya.')
  }
  await db.delete(transaksiKas).where(eq(transaksiKas.id, id))

  await logActivity({
    userId: session.user.id,
    action: 'delete',
    entityType: 'transaksi_kas',
    entityId: id,
    description: describeActivity('delete', 'transaksi_kas', existing ? `${existing.arah} ${existing.kategori} • Rp${existing.jumlah}` : id),
    oldValues: existing
      ? { tanggal: existing.tanggal, akunId: existing.akunId, arah: existing.arah, jumlah: existing.jumlah, kategori: existing.kategori }
      : undefined,
  })

  revalidatePath('/kas')
  return { success: true }
}

export async function getAkunKasList() {
  await requireModuleSession('kas')
  return db.select().from(akunKas).orderBy(akunKas.urutan)
}

// Paginasi window: tanpa filter → hanya LIST_PAGE_SIZE baris terbaru (offset utk
// "Muat lebih banyak"); dengan filter tanggal → SEMUA baris rentang itu (bounded),
// supaya ringkasan/agregat klien atas rentang tetap persis benar.
export async function getKasTransactions(opts?: {
  dari?: string
  sampai?: string
  offset?: number
  limit?: number
}) {
  await requireModuleSession('kas')
  const { dari, sampai, offset, limit } = opts ?? {}
  const ranged = Boolean(dari || sampai)
  const rows = await db.query.transaksiKas.findMany({
    where: ranged
      ? (t, { and, gte, lte }) =>
          and(
            ...(dari ? [gte(t.tanggal, dari)] : []),
            ...(sampai ? [lte(t.tanggal, sampai)] : []),
          )
      : undefined,
    orderBy: (t, { desc }) => [desc(t.tanggal), desc(t.createdAt)],
    limit: ranged ? undefined : (limit ?? LIST_PAGE_SIZE),
    offset: ranged ? undefined : (offset ?? 0),
    with: { akun: true },
  })
  return rows
}

// Agregat all-time via SQL (bukan dari baris yang dimuat klien) — satu query
// GROUP BY (akunId, arah) sekaligus memberi total masuk/keluar, jumlah baris,
// dan net mutasi per akun untuk kartu Saldo Rekening.
export async function getKasStats() {
  await requireModuleSession('kas')
  const grouped = await db
    .select({
      akunId: transaksiKas.akunId,
      arah: transaksiKas.arah,
      total: sum(transaksiKas.jumlah),
      n: count(),
    })
    .from(transaksiKas)
    .groupBy(transaksiKas.akunId, transaksiKas.arah)

  let totalMasuk = 0
  let totalKeluar = 0
  let totalCount = 0
  const netPerAkun: Record<string, number> = {}
  for (const g of grouped) {
    const jumlah = Number(g.total ?? 0)
    totalCount += g.n
    if (g.arah === 'masuk') totalMasuk += jumlah
    else totalKeluar += jumlah
    netPerAkun[g.akunId] = (netPerAkun[g.akunId] ?? 0) + (g.arah === 'masuk' ? jumlah : -jumlah)
  }
  return { totalMasuk, totalKeluar, totalCount, netPerAkun }
}
