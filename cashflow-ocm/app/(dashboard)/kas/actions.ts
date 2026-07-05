'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { transaksiKas, akunKas } from '@/lib/db/schema'
import { z } from 'zod'
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

// Kategori yang WAJAR untuk entri kas MANUAL. Kategori lain — penerimaan_bga,
// bayar_peron, modal_peron, kembali_modal, biaya_operasional — HANYA dibuat
// otomatis oleh modul induk (penjualan/pembelian/biaya/modal) dengan refTabel;
// membuatnya manual = dobel-hitung/rekonsiliasi bocor. Dipakai sebagai gerbang
// server-side (bukan cuma UI).
// TIDAK di-export: file 'use server' hanya boleh meng-export async function
// (form kas memegang salinan daftar ini sendiri).
const KATEGORI_KAS_MANUAL = ['tarik_bri', 'penyesuaian', 'lainnya'] as const

const kasSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
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
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canCreate')

  const data = kasCreateSchema.parse({
    tanggal: formData.get('tanggal'),
    akunId: formData.get('akunId'),
    arah: formData.get('arah'),
    jumlah: formData.get('jumlah'),
    kategori: formData.get('kategori'),
    catatan: formData.get('catatan') || undefined,
  })

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
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canEdit')

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
  await requireSession()
  return db.select().from(akunKas).orderBy(akunKas.urutan)
}

export async function getKasTransactions() {
  await requireSession()
  const rows = await db.query.transaksiKas.findMany({
    orderBy: (t, { desc }) => [desc(t.tanggal), desc(t.createdAt)],
    with: { akun: true },
  })
  return rows
}
