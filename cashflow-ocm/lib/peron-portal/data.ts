import 'server-only'
import { getDb } from '@/lib/db'
import { peron, peronAccess, pembelian, hargaAcuan } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { todayWIB } from '@/lib/peron-health/week'

export type Periode = 'bulan-ini' | 'bulan-lalu' | 'semua'

function monthPrefix(offset: number): string {
  // offset 0 = bulan ini (WIB), -1 = bulan lalu
  const today = todayWIB() // YYYY-MM-DD
  const [y, m] = today.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + offset, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * Data portal untuk SATU peron, dipanggil HANYA dari server component /p/[token]
 * setelah validasi token. Mengembalikan null bila token invalid/nonaktif.
 * TIDAK pernah memuat margin OCM, harga jual BGA, atau data peron lain.
 */
export async function getPortalData(token: string, periode: Periode = 'bulan-ini') {
  if (!token || token.length < 32) return null
  const db = getDb()

  const access = await db
    .select({ peronId: peronAccess.peronId })
    .from(peronAccess)
    .where(and(eq(peronAccess.token, token), eq(peronAccess.isActive, true)))
    .limit(1)
  if (!access[0]) return null
  const peronId = access[0].peronId

  const [peronRow, rows, hargaRows] = await Promise.all([
    db.select({ nama: peron.nama }).from(peron).where(eq(peron.id, peronId)).limit(1),
    db
      .select({
        tanggal: pembelian.tanggal,
        kategori: pembelian.kategori,
        tonase: pembelian.tonase,
        hargaBeli: pembelian.hargaBeli,
        totalBeli: pembelian.totalBeli,
        statusBayar: pembelian.statusBayarPeron,
        tanggalBayar: pembelian.tanggalBayar,
      })
      .from(pembelian)
      .where(eq(pembelian.peronId, peronId))
      .orderBy(desc(pembelian.tanggal)),
    // Harga acuan publik (harga lapangan saja — bukan margin/jual BGA)
    db
      .select({ produk: hargaAcuan.produk, hargaLapangan: hargaAcuan.hargaLapangan, tanggal: hargaAcuan.tanggalBerlaku })
      .from(hargaAcuan)
      .orderBy(desc(hargaAcuan.tanggalBerlaku)),
  ])
  if (!peronRow[0]) return null

  // Sisa belum dibayar = SELURUH tiket berstatus 'belum' (all-time outstanding)
  const sisaBelumDibayar = rows
    .filter((r) => r.statusBayar === 'belum')
    .reduce((s, r) => s + (r.totalBeli ?? 0), 0)

  // Ringkasan periode
  const prefix = periode === 'semua' ? '' : periode === 'bulan-lalu' ? monthPrefix(-1) : monthPrefix(0)
  const inPeriod = rows.filter((r) => (prefix ? r.tanggal.startsWith(prefix) : true))
  const totalKg = inPeriod.reduce((s, r) => s + (r.tonase ?? 0), 0)
  const totalNilai = inPeriod.reduce((s, r) => s + (r.totalBeli ?? 0), 0)
  const sudahDibayar = inPeriod.filter((r) => r.statusBayar === 'lunas').reduce((s, r) => s + (r.totalBeli ?? 0), 0)

  // Setoran (semua) & pembayaran (tiket lunas, dgn tanggal bayar)
  const setoran = inPeriod.map((r) => ({
    tanggal: r.tanggal,
    kategori: r.kategori,
    tonase: r.tonase,
    hargaBeli: r.hargaBeli,
    total: r.totalBeli,
  }))
  const pembayaran = rows
    .filter((r) => r.statusBayar === 'lunas')
    .filter((r) => (prefix ? (r.tanggalBayar ?? r.tanggal).startsWith(prefix) : true))
    .map((r) => ({ tanggal: r.tanggalBayar ?? r.tanggal, jumlah: r.totalBeli }))

  // Harga acuan terkini per produk (ambil baris terbaru tiap produk)
  const hargaTerkini: { produk: string; harga: number }[] = []
  const seen = new Set<string>()
  for (const h of hargaRows) {
    if (seen.has(h.produk)) continue
    seen.add(h.produk)
    hargaTerkini.push({ produk: h.produk, harga: h.hargaLapangan })
  }

  // Update lastViewedAt (fire-and-forget; jangan blok render)
  db.update(peronAccess).set({ lastViewedAt: new Date() }).where(eq(peronAccess.peronId, peronId)).catch(() => {})

  return {
    nama: peronRow[0].nama,
    sisaBelumDibayar,
    periode,
    totalKg,
    totalNilai,
    sudahDibayar,
    setoran,
    pembayaran,
    hargaTerkini,
  }
}
