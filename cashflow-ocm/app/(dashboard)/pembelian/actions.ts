'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, and, sum, count } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { pembelian, pembelianDetail, transaksiKas, akunKas, peron, hargaAcuan, pembelianFoto } from '@/lib/db/schema'
import { z } from 'zod'
import { notifyNewPembelian } from '@/lib/notification'
import { requirePermission } from '@/lib/permissions'
import { logActivity, describeActivity } from '@/lib/audit'
import { effectiveKeuntunganPerKg, isKategoriTBS } from '@/lib/harga'
import { todayString } from '@/lib/format'
import { LIST_PAGE_SIZE } from '@/lib/pagination'

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

export type KategoriPembelian = 'OCM R1' | 'OCM R2' | 'OCMP SAGU' | 'OCM BRDL' | 'OCM BRDL KTWM' | 'OCM BRDL TRYM' | 'OCM BRDL LMDM'

export interface DetailInput {
  noTid?: string
  tonase: number
  hargaLapangan: number // harga yang dibayar ke peron
  tanggalReplas?: string // awal rentang replas ("dari", opsional)
  tanggalReplasSampai?: string // akhir rentang replas ("sampai", null = tanggal tunggal)
  jumlahReplas?: number // jumlah replas pada baris ini
}

const pembelianSchema = z.object({
  tanggal: z.string().min(1),
  kategori: z.enum(['OCM R1', 'OCM R2', 'OCMP SAGU', 'OCM BRDL', 'OCM BRDL KTWM', 'OCM BRDL TRYM', 'OCM BRDL LMDM']),
  peronId: z.string().min(1),
  statusBayarPeron: z.enum(['belum', 'lunas']).default('belum'),
  sumberBayarId: z.string().optional(),
  catatan: z.string().optional(),
  keterangan: z.string().optional(),
  details: z.array(z.object({
    noTid: z.string().optional(),
    tonase: z.number().positive(),
    hargaLapangan: z.number().positive(),
    tanggalReplas: z.string().optional(),
    tanggalReplasSampai: z.string().optional(),
    jumlahReplas: z.number().int().nonnegative().optional(),
  })).min(1, 'Minimal 1 baris detail'),
  fotoUrls: z.array(z.string()).optional(),
  idempotencyKey: z.string().optional(),
})

function computeTotals(details: DetailInput[], keuntunganPerKg: number, isTBS: boolean) {
  // Untung CV efektif: untuk non-TBS, kelebihan peron di-cap (CAP_KEUNTUNGAN_PERON)
  // sehingga untung CV ter-floor & Harga Jual BGA tetap acuan + selisih. TBS apa adanya.
  const untungEfektif = effectiveKeuntunganPerKg(keuntunganPerKg, isTBS)
  let totalTonase = 0, totalBeli = 0, totalJual = 0, totalKeuntungan = 0
  const computed = details.map((d, i) => {
    const hargaJual = d.hargaLapangan + untungEfektif
    // Tonase bisa pecahan (mis. 15.53 kg) sehingga subtotal bisa menghasilkan
    // pecahan rupiah. Bulatkan ke rupiah utuh agar tidak ada sen yang menumpuk.
    const subtotalBeli = Math.round(d.tonase * d.hargaLapangan)
    const subtotalJual = Math.round(d.tonase * hargaJual)
    const keuntungan = subtotalJual - subtotalBeli
    totalTonase += d.tonase
    totalBeli += subtotalBeli
    totalJual += subtotalJual
    totalKeuntungan += keuntungan
    return { ...d, hargaJual, subtotalBeli, subtotalJual, keuntungan, urutan: i }
  })
  // Header hargaBeli/hargaJual = rata-rata tertimbang (Rp/kg). Saat harga campur
  // antar baris, ini representasi yang benar untuk portal peron (yang menampilkan
  // "Rp X/kg" per tiket) — bukan harga baris pertama saja. /laporan tidak memakai
  // field ini (pakai total), jadi tidak ada regresi.
  const hargaBeliRata = totalTonase > 0 ? Math.round(totalBeli / totalTonase) : 0
  const hargaJualRata = totalTonase > 0 ? Math.round(totalJual / totalTonase) : 0
  return { computed, totalTonase, totalBeli, totalJual, totalKeuntungan, hargaBeliRata, hargaJualRata }
}

export async function createPembelian(data: {
  tanggal: string
  kategori: KategoriPembelian
  peronId: string
  statusBayarPeron: 'belum' | 'lunas'
  sumberBayarId?: string
  catatan?: string
  keterangan?: string
  details: DetailInput[]
  fotoUrls?: string[]
  idempotencyKey?: string
}) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canCreate')
  const parsed = pembelianSchema.parse(data)

  // W1: 'lunas' tanpa sumber bayar = kas keluar tak tercatat → kas overstated. Tolak
  // (selaras paksaan akun pada modal/DP peron).
  if (parsed.statusBayarPeron === 'lunas' && !parsed.sumberBayarId) {
    throw new Error('Pembelian berstatus LUNAS wajib punya sumber bayar (akun kas) agar saldo kas ikut tercatat.')
  }

  const peronData = await db.query.peron.findFirst({ where: (t, { eq }) => eq(t.id, parsed.peronId) })
  if (!peronData) throw new Error('Peron tidak ditemukan')

  const { computed, totalTonase, totalBeli, totalJual, totalKeuntungan, hargaBeliRata, hargaJualRata } = computeTotals(parsed.details, peronData.keuntunganPerKg, isKategoriTBS(parsed.kategori))

  // Anti-dobel: tolak pembelian identik dari user yang sama dalam ~60 detik terakhir
  // (retry saat sinyal lapangan jelek / double-submit). Match sangat spesifik
  // (peron + tanggal + total + tonase sama persis) agar tak memblokir transaksi sah.
  const recentCutoff = new Date(Date.now() - 60_000)
  const dup = await db.query.pembelian.findFirst({
    where: (t, { and, eq, gte }) => and(
      eq(t.createdBy, session.user.id),
      eq(t.peronId, parsed.peronId),
      eq(t.tanggal, parsed.tanggal),
      eq(t.totalBeli, totalBeli),
      eq(t.tonase, totalTonase),
      gte(t.createdAt, recentCutoff),
    ),
  })
  if (dup) throw new Error('Pembelian identik baru saja tercatat (~1 menit lalu). Bila ini transaksi berbeda, ubah sedikit (mis. catatan) lalu simpan lagi.')

  // Semua penulisan uang (header + detail + mutasi kas) dibungkus dalam satu
  // transaksi agar atomic — tidak ada kemungkinan data parsial bila gagal di tengah.
  const pembelianId = await db.transaction(async (tx) => {
    const inserted = await tx.insert(pembelian).values({
      tanggal: parsed.tanggal,
      kategori: parsed.kategori,
      peronId: parsed.peronId,
      tonase: totalTonase,
      hargaBeli: hargaBeliRata,
      hargaJual: hargaJualRata,
      totalBeli,
      totalJual,
      keuntungan: totalKeuntungan,
      keuntunganPerKg: peronData.keuntunganPerKg, // W2: snapshot tarif saat transaksi
      statusBayarPeron: parsed.statusBayarPeron,
      sumberBayarId: parsed.sumberBayarId,
      catatan: parsed.catatan,
      keterangan: parsed.keterangan,
      createdBy: session.user.id,
      idempotencyKey: parsed.idempotencyKey,
    }).onConflictDoNothing({ target: pembelian.idempotencyKey }).returning()
    // Race-proof: bila key sama sudah masuk (double-submit benar-benar bersamaan),
    // onConflict mengembalikan kosong → tolak agar tak ada baris dobel.
    if (inserted.length === 0) throw new Error('Pembelian ini sudah tercatat (pengiriman ganda terdeteksi). Cek daftar, jangan input ulang.')
    const id = inserted[0].id

    await tx.insert(pembelianDetail).values(
      computed.map((d) => ({
        pembelianId: id,
        noTid: d.noTid || null,
        tonase: d.tonase,
        hargaLapangan: d.hargaLapangan,
        subtotalBeli: d.subtotalBeli,
        subtotalJual: d.subtotalJual,
        keuntungan: d.keuntungan,
        urutan: d.urutan,
        tanggalReplas: d.tanggalReplas || null,
        tanggalReplasSampai: d.tanggalReplasSampai || null,
        jumlahReplas: d.jumlahReplas ?? null,
      }))
    )

    if (parsed.statusBayarPeron === 'lunas' && parsed.sumberBayarId) {
      const tids = computed.map((d) => d.noTid).filter(Boolean).join(', ')
      await tx.insert(transaksiKas).values({
        tanggal: parsed.tanggal,
        akunId: parsed.sumberBayarId,
        arah: 'keluar',
        jumlah: totalBeli,
        kategori: 'bayar_peron',
        refTabel: 'pembelian',
        refId: id,
        // Defense-in-depth: kunci unik 1 entri kas otomatis per induk (uniqueIndex
        // transaksi_kas.idempotency_key). create=refId baru, edit=hapus-lalu-buat → tak
        // pernah tolak insert sah; hanya backstop bila ada double-insert (bug).
        idempotencyKey: `pembelian:${id}`,
        catatan: `Bayar peron ${peronData.nama}${tids ? ` TID ${tids}` : ''}`,
        createdBy: session.user.id,
      })
    }

    // Foto bukti ditulis di dalam transaksi yang sama agar tidak ada foto orphan
    // bila proses gagal di tengah (mis. sinyal lapangan putus).
    if (parsed.fotoUrls && parsed.fotoUrls.length > 0) {
      await tx.insert(pembelianFoto).values(parsed.fotoUrls.map((url) => ({ pembelianId: id, url })))
    }

    return id
  })

  // Audit trail di luar transaksi (kegagalan audit tidak boleh membatalkan transaksi uang)
  await logActivity({
    userId: session.user.id,
    action: 'create',
    entityType: 'pembelian',
    entityId: pembelianId,
    description: describeActivity('create', 'pembelian', `${parsed.kategori} dari ${peronData.nama}`),
    newValues: {
      kategori: parsed.kategori,
      peronId: parsed.peronId,
      totalBeli,
      totalJual,
      keuntungan: totalKeuntungan,
      statusBayarPeron: parsed.statusBayarPeron,
    },
  })

  // Trigger Telegram Notification (di-await agar andal di serverless & error tertangkap;
  // sendTelegramMessage punya try/catch internal sehingga tidak melempar)
  try {
    await notifyNewPembelian({
      tanggal: parsed.tanggal,
      kategori: parsed.kategori,
      peronId: parsed.peronId,
      tonase: totalTonase,
      totalBeli,
      keuntungan: totalKeuntungan,
      statusBayarPeron: parsed.statusBayarPeron,
      catatan: parsed.catatan,
      createdByName: session.user.name,
      createdByRole: session.user.role,
    })
  } catch (err) {
    console.error('Failed to trigger Telegram notification for Pembelian:', err)
  }

  revalidatePath('/pembelian')
  return { success: true, id: pembelianId }
}

export async function updatePembelian(id: string, data: {
  tanggal: string
  kategori: KategoriPembelian
  peronId: string
  statusBayarPeron: 'belum' | 'lunas'
  sumberBayarId?: string
  catatan?: string
  keterangan?: string
  details: DetailInput[]
  fotoUrls?: string[]
}) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canEdit')
  const parsed = pembelianSchema.parse(data)

  // W1: 'lunas' tanpa sumber bayar = kas keluar tak tercatat → kas overstated. Tolak.
  if (parsed.statusBayarPeron === 'lunas' && !parsed.sumberBayarId) {
    throw new Error('Pembelian berstatus LUNAS wajib punya sumber bayar (akun kas) agar saldo kas ikut tercatat.')
  }

  const peronData = await db.query.peron.findFirst({ where: (t, { eq }) => eq(t.id, parsed.peronId) })
  if (!peronData) throw new Error('Peron tidak ditemukan')

  // W2: bekukan tarif untung/kg historis. Pakai snapshot tersimpan kecuali peron
  // diganti (lalu adopsi tarif peron baru). Baris lama (null) → fallback live.
  const existingPembelian = await db.query.pembelian.findFirst({ where: (t, { eq }) => eq(t.id, id) })
  const peronBerubah = !existingPembelian || existingPembelian.peronId !== parsed.peronId
  const keuntunganSnapshot = (!peronBerubah && existingPembelian?.keuntunganPerKg != null)
    ? existingPembelian.keuntunganPerKg
    : peronData.keuntunganPerKg

  const { computed, totalTonase, totalBeli, totalJual, totalKeuntungan, hargaBeliRata, hargaJualRata } = computeTotals(parsed.details, keuntunganSnapshot, isKategoriTBS(parsed.kategori))

  // Update + ganti detail + sinkron mutasi kas, atomic dalam satu transaksi.
  await db.transaction(async (tx) => {
    await tx.update(pembelian).set({
      tanggal: parsed.tanggal,
      kategori: parsed.kategori,
      peronId: parsed.peronId,
      tonase: totalTonase,
      hargaBeli: hargaBeliRata,
      hargaJual: hargaJualRata,
      totalBeli,
      totalJual,
      keuntungan: totalKeuntungan,
      keuntunganPerKg: keuntunganSnapshot, // W2: freeze tarif untung historis
      statusBayarPeron: parsed.statusBayarPeron,
      sumberBayarId: parsed.sumberBayarId,
      catatan: parsed.catatan,
      keterangan: parsed.keterangan,
    }).where(eq(pembelian.id, id))

    // Replace all details
    await tx.delete(pembelianDetail).where(eq(pembelianDetail.pembelianId, id))
    await tx.insert(pembelianDetail).values(
      computed.map((d) => ({
        pembelianId: id,
        noTid: d.noTid || null,
        tonase: d.tonase,
        hargaLapangan: d.hargaLapangan,
        subtotalBeli: d.subtotalBeli,
        subtotalJual: d.subtotalJual,
        keuntungan: d.keuntungan,
        urutan: d.urutan,
        tanggalReplas: d.tanggalReplas || null,
        tanggalReplasSampai: d.tanggalReplasSampai || null,
        jumlahReplas: d.jumlahReplas ?? null,
      }))
    )

    await tx.delete(transaksiKas).where(and(eq(transaksiKas.refTabel, 'pembelian'), eq(transaksiKas.refId, id)))
    if (parsed.statusBayarPeron === 'lunas' && parsed.sumberBayarId) {
      const tids = computed.map((d) => d.noTid).filter(Boolean).join(', ')
      await tx.insert(transaksiKas).values({
        tanggal: parsed.tanggal,
        akunId: parsed.sumberBayarId,
        arah: 'keluar',
        jumlah: totalBeli,
        kategori: 'bayar_peron',
        refTabel: 'pembelian',
        refId: id,
        // Defense-in-depth: kunci unik 1 entri kas otomatis per induk (uniqueIndex
        // transaksi_kas.idempotency_key). create=refId baru, edit=hapus-lalu-buat → tak
        // pernah tolak insert sah; hanya backstop bila ada double-insert (bug).
        idempotencyKey: `pembelian:${id}`,
        catatan: `Bayar peron ${peronData.nama}${tids ? ` TID ${tids}` : ''}`,
        createdBy: session.user.id,
      })
    }

    // Ganti foto bukti di dalam transaksi yang sama (atomic dengan update uang)
    await tx.delete(pembelianFoto).where(eq(pembelianFoto.pembelianId, id))
    if (parsed.fotoUrls && parsed.fotoUrls.length > 0) {
      await tx.insert(pembelianFoto).values(parsed.fotoUrls.map((url) => ({ pembelianId: id, url })))
    }
  })

  await logActivity({
    userId: session.user.id,
    action: 'update',
    entityType: 'pembelian',
    entityId: id,
    description: describeActivity('update', 'pembelian', `${parsed.kategori} dari ${peronData.nama}`),
    newValues: {
      kategori: parsed.kategori,
      peronId: parsed.peronId,
      totalBeli,
      totalJual,
      keuntungan: totalKeuntungan,
      statusBayarPeron: parsed.statusBayarPeron,
    },
  })

  revalidatePath('/pembelian')
  return { success: true }
}

export async function deletePembelian(id: string) {
  // Hapus data keuangan = OWNER-ONLY (diseragamkan 15 Jun 2026; sebelumnya
  // canDelete = owner+admin). Penjualan/kas/peron sudah owner-only — kini sama.
  const session = await requireOwner()

  // Ambil data lama dulu untuk jejak audit
  const existing = await db.query.pembelian.findFirst({
    where: eq(pembelian.id, id),
    with: { peron: true },
  })

  // Atomic: hapus kas terkait + header pembelian dalam satu transaksi.
  // Detail ikut terhapus via ON DELETE CASCADE. Kalau koneksi putus di tengah
  // (sinyal lapangan jelek), tidak ada lagi state setengah-jadi yang bikin
  // saldo kas tidak cocok dengan data pembelian.
  await db.transaction(async (tx) => {
    await tx.delete(transaksiKas).where(and(eq(transaksiKas.refTabel, 'pembelian'), eq(transaksiKas.refId, id)))
    // W9: hapus anak EKSPLISIT (jangan andalkan FK cascade — foreign_keys OFF di Turso/libSQL)
    await tx.delete(pembelianFoto).where(eq(pembelianFoto.pembelianId, id))
    await tx.delete(pembelianDetail).where(eq(pembelianDetail.pembelianId, id))
    await tx.delete(pembelian).where(eq(pembelian.id, id))
  })

  await logActivity({
    userId: session.user.id,
    action: 'delete',
    entityType: 'pembelian',
    entityId: id,
    description: describeActivity('delete', 'pembelian', existing ? `${existing.peron?.nama ?? ''} • Rp${existing.totalBeli}` : id),
    oldValues: existing
      ? {
          tanggal: existing.tanggal,
          peron: existing.peron?.nama,
          tonase: existing.tonase,
          totalBeli: existing.totalBeli,
          totalJual: existing.totalJual,
          keuntungan: existing.keuntungan,
          statusBayarPeron: existing.statusBayarPeron,
        }
      : undefined,
  })

  revalidatePath('/pembelian')
  return { success: true }
}

// Paginasi window (pola Kas): tanpa filter → hanya LIST_PAGE_SIZE tiket terbaru
// (offset utk "Muat lebih banyak"); dengan filter tanggal/peron → SEMUA baris yang
// cocok (bounded), agar ringkasan & PrintRekap atas hasil filter tetap persis benar.
export async function getPembelianList(opts?: {
  dari?: string
  sampai?: string
  peronId?: string
  offset?: number
  limit?: number
}) {
  await requireSession()
  const { dari, sampai, peronId, offset, limit } = opts ?? {}
  const adaFilter = Boolean(dari || sampai || peronId)
  return db.query.pembelian.findMany({
    where: adaFilter
      ? (p, { and, gte, lte, eq }) =>
          and(
            ...(dari ? [gte(p.tanggal, dari)] : []),
            ...(sampai ? [lte(p.tanggal, sampai)] : []),
            ...(peronId ? [eq(p.peronId, peronId)] : []),
          )
      : undefined,
    orderBy: (p, { desc }) => [desc(p.tanggal), desc(p.createdAt)],
    limit: adaFilter ? undefined : (limit ?? LIST_PAGE_SIZE),
    offset: adaFilter ? undefined : (offset ?? 0),
    with: { peron: true, sumberBayar: true, fotos: true, details: { orderBy: (d, { asc }) => [asc(d.urutan)] } },
  })
}

// Agregat all-time via SQL (bukan dari window baris yang dimuat klien) — satu
// query GROUP BY statusBayarPeron sekaligus memberi total + jumlah tiket belum
// dibayar untuk kartu ringkasan saat tanpa filter.
export async function getPembelianStats() {
  await requireSession()
  const grouped = await db
    .select({
      status: pembelian.statusBayarPeron,
      n: count(),
      tonase: sum(pembelian.tonase),
      beli: sum(pembelian.totalBeli),
      jual: sum(pembelian.totalJual),
      untung: sum(pembelian.keuntungan),
    })
    .from(pembelian)
    .groupBy(pembelian.statusBayarPeron)

  let totalCount = 0
  let totalTonase = 0
  let totalBeli = 0
  let totalJual = 0
  let totalUntung = 0
  let jumlahBelum = 0
  for (const g of grouped) {
    totalCount += g.n
    totalTonase += Number(g.tonase ?? 0) // kolom real → Number()
    totalBeli += Number(g.beli ?? 0)
    totalJual += Number(g.jual ?? 0)
    totalUntung += Number(g.untung ?? 0)
    if (g.status === 'belum') jumlahBelum = g.n
  }
  return { totalCount, totalTonase, totalBeli, totalJual, totalUntung, jumlahBelum }
}

export async function getAkunKasList() {
  await requireSession()
  return db.select().from(akunKas).orderBy(akunKas.urutan)
}

// Ringan: jumlah keuntungan saja (untuk kartu "Estimasi Laba" di halaman Penjualan)
// — tanpa menarik seluruh baris pembelian + relasi foto/detail.
export async function getEstimasiLaba(): Promise<number> {
  await requireSession()
  const row = await db.select({ total: sum(pembelian.keuntungan) }).from(pembelian)
  return Number(row[0]?.total ?? 0)
}

export async function getKeuntunganPerKg(peronId: string): Promise<number> {
  await requireSession()
  const p = await db.query.peron.findFirst({ where: (t, { eq }) => eq(t.id, peronId) })
  return p?.keuntunganPerKg ?? 0
}

export async function getLatestHargaAcuan(produk: 'TBS' | 'BRDL KTWM' | 'BRDL TRYM' | 'BRDL LMDM', tanggal?: string) {
  await requireSession()
  const targetDate = tanggal || todayString()
  // LMDM selalu mirror TRYM — lookup LMDM dialihkan ke TRYM agar tak pernah blank.
  const lookupProduk = produk === 'BRDL LMDM' ? 'BRDL TRYM' : produk
  const result = await db.query.hargaAcuan.findFirst({
    where: (t, { and, eq, lte }) => and(
      eq(t.produk, lookupProduk),
      lte(t.tanggalBerlaku, targetDate),
    ),
    orderBy: (t, { desc }) => [desc(t.tanggalBerlaku), desc(t.createdAt)],
  })
  return result ?? null
}

// Seluruh riwayat harga acuan satu produk (urut tanggal naik) — untuk auto-harga
// PER BARIS di dialog: klien menghitung harga acuan tiap baris dari tanggal "dari"
// baris itu (step-function) tanpa bolak-balik ke server, sekaligus mendeteksi
// rentang yang melewati >1 harga acuan.
export async function getHargaAcuanListForProduk(
  produk: 'TBS' | 'BRDL KTWM' | 'BRDL TRYM' | 'BRDL LMDM',
) {
  await requireSession()
  const rows = await db.query.hargaAcuan.findMany({
    where: (t, { eq }) => eq(t.produk, produk),
    orderBy: (t, { asc }) => [asc(t.tanggalBerlaku), asc(t.createdAt)],
  })
  return rows.map((r) => ({
    tanggalBerlaku: r.tanggalBerlaku,
    hargaLapangan: r.hargaLapangan,
    selisihJualBga: r.selisihJualBga,
  }))
}
