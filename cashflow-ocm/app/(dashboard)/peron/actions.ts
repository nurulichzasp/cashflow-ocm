'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, sum } from 'drizzle-orm'
import { db } from '@/lib/db'
import { peron, modalPeron, transaksiKas } from '@/lib/db/schema'
import { and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { requirePermission } from '@/lib/permissions'

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

// ─── Schemas ─────────────────────────────────────────────────────────────────

const peronSchema = z.object({
  kode: z.coerce.number().int().optional().nullable(),
  nama: z.string().min(1, 'Nama wajib diisi'),
  kontak: z.string().optional(),
  alamat: z.string().optional(),
  status: z.enum(['aktif', 'nonaktif']).default('aktif'),
  keuntunganPerKg: z.coerce.number().min(0, 'Keuntungan harus ≥ 0'),
})

const modalSchema = z.object({
  peronId: z.string().min(1),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  jenis: z.enum(['tambah', 'kurang', 'kembali']),
  jumlah: z.coerce.number().positive('Jumlah harus positif'),
  akunSumberId: z.string().optional(),
  catatan: z.string().optional(),
})

// ─── Peron CRUD ───────────────────────────────────────────────────────────────

export async function createPeron(formData: FormData) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canCreate')
  const data = peronSchema.parse({
    kode: formData.get('kode') || undefined,
    nama: formData.get('nama'),
    kontak: formData.get('kontak') || undefined,
    alamat: formData.get('alamat') || undefined,
    status: formData.get('status') || 'aktif',
    keuntunganPerKg: formData.get('keuntunganPerKg'),
  })

  await db.insert(peron).values({
    kode: data.kode ?? null,
    nama: data.nama,
    kontak: data.kontak,
    alamat: data.alamat,
    status: data.status,
    keuntunganPerKg: data.keuntunganPerKg,
  })
  revalidatePath('/peron')
  return { success: true }
}

export async function updatePeron(id: string, formData: FormData) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canEdit')
  const data = peronSchema.parse({
    kode: formData.get('kode') || undefined,
    nama: formData.get('nama'),
    kontak: formData.get('kontak') || undefined,
    alamat: formData.get('alamat') || undefined,
    status: formData.get('status') || 'aktif',
    keuntunganPerKg: formData.get('keuntunganPerKg'),
  })

  await db.update(peron).set({
    kode: data.kode ?? null,
    nama: data.nama,
    kontak: data.kontak,
    alamat: data.alamat,
    status: data.status,
    keuntunganPerKg: data.keuntunganPerKg,
  }).where(eq(peron.id, id))
  revalidatePath('/peron')
  return { success: true }
}

export async function deletePeron(id: string) {
  await requireOwner()
  await db.delete(peron).where(eq(peron.id, id))
  revalidatePath('/peron')
  return { success: true }
}

// ─── Modal/DP Peron ───────────────────────────────────────────────────────────

export async function addModalPeron(formData: FormData) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canCreate')
  const data = modalSchema.parse({
    peronId: formData.get('peronId'),
    tanggal: formData.get('tanggal'),
    jenis: formData.get('jenis'),
    jumlah: formData.get('jumlah'),
    akunSumberId: formData.get('akunSumberId') || undefined,
    catatan: formData.get('catatan') || undefined,
  })

  // Cari nama peron untuk catatan kas
  const peronData = await db.query.peron.findFirst({ where: (t, { eq }) => eq(t.id, data.peronId) })
  const peronNama = peronData?.nama ?? 'Peron'

  // Atomic: catat modal + mutasi kas sekaligus
  await db.transaction(async (tx) => {
    const inserted = await tx.insert(modalPeron).values({
      peronId: data.peronId,
      tanggal: data.tanggal,
      jenis: data.jenis,
      jumlah: data.jumlah,
      catatan: data.catatan,
      createdBy: session.user.id,
    }).returning()

    // Sinkronisasi kas: tambah = uang keluar, kembali = uang masuk
    // kurang = hanya pencatatan internal (potong tagihan), tidak ada kas fisik
    if (data.akunSumberId && (data.jenis === 'tambah' || data.jenis === 'kembali')) {
      await tx.insert(transaksiKas).values({
        tanggal: data.tanggal,
        akunId: data.akunSumberId,
        arah: data.jenis === 'tambah' ? 'keluar' : 'masuk',
        jumlah: data.jumlah,
        kategori: data.jenis === 'tambah' ? 'modal_peron' : 'kembali_modal',
        refTabel: 'modal_peron',
        refId: inserted[0].id,
        catatan: `${data.jenis === 'tambah' ? 'DP/Modal ke' : 'Kembali modal dari'} peron ${peronNama}`,
        createdBy: session.user.id,
      })
    }
  })

  revalidatePath('/peron')
  revalidatePath('/kas')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteModalPeron(id: string) {
  await requireOwner()
  await db.transaction(async (tx) => {
    // Hapus transaksi kas terkait dulu
    await tx.delete(transaksiKas).where(and(eq(transaksiKas.refTabel, 'modal_peron'), eq(transaksiKas.refId, id)))
    await tx.delete(modalPeron).where(eq(modalPeron.id, id))
  })
  revalidatePath('/peron')
  revalidatePath('/kas')
  revalidatePath('/dashboard')
  return { success: true }
}

// ─── Data queries ─────────────────────────────────────────────────────────────

export async function getPeronList() {
  const peronList = await db.query.peron.findMany({
    orderBy: (p, { asc }) => [asc(p.nama)],
  })

  const dpRows = await db
    .select({ peronId: modalPeron.peronId, jenis: modalPeron.jenis, total: sum(modalPeron.jumlah) })
    .from(modalPeron)
    .groupBy(modalPeron.peronId, modalPeron.jenis)

  const dpMap: Record<string, number> = {}
  for (const row of dpRows) {
    const prev = dpMap[row.peronId] ?? 0
    const val = Number(row.total ?? 0)
    if (row.jenis === 'tambah') dpMap[row.peronId] = prev + val
    else dpMap[row.peronId] = (dpMap[row.peronId] ?? 0) - val
  }

  return peronList.map((p) => ({ ...p, dpAktif: dpMap[p.id] ?? 0 }))
}

export async function getPeronById(id: string) {
  const p = await db.query.peron.findFirst({ where: (t, { eq }) => eq(t.id, id) })
  if (!p) return null

  const modal = await db.query.modalPeron.findMany({
    where: (t, { eq }) => eq(t.peronId, id),
    orderBy: (t, { desc }) => [desc(t.tanggal)],
    with: { createdByUser: true },
  })

  const dpAktif = modal.reduce((acc, m) => {
    return m.jenis === 'tambah' ? acc + m.jumlah : acc - m.jumlah
  }, 0)

  return { ...p, modal, dpAktif }
}
