'use server'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  transaksiKas, biayaOperasional, penjualan,
  pembelian, peron, modalPeron, akunKas,
  ppnBulanan, pphBulanan, appSettings,
} from '@/lib/db/schema'
import { eq, sum, and, gte, lte, lt, asc, like } from 'drizzle-orm'
import { requirePermission } from '@/lib/permissions'
import { hitungPpn, hitungPphBadan, DEFAULT_PPH25_NOMINAL, TARIF_PPN, TARIF_PPH_BADAN, parseTarifPersen } from '@/lib/pajak'

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Tidak terautentikasi')
  return session
}

// Semua laporan di sini menampilkan angka keuangan. Hanya peran dengan hak
// canViewFinance yang boleh — cegah kasir/peran tak dikenal membaca laba-rugi,
// neraca, pajak, dan buku kas.
async function requireFinanceAccess() {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canViewFinance')
  return session
}

export async function getLaporanData(dari: string, sampai: string) {
  await requireFinanceAccess()

  const [
    penjualanTotalRow,
    biayaTotalRow,
    allAkun,
    kasTransaksi,
    pembelianList,
    dpRows,
    allPeron,
  ] = await Promise.all([
    // Basis AKRUAL: hitung SEMUA penjualan dalam periode (lunas maupun belum),
    // simetris dengan pembelian yang juga dihitung semua, agar laba tidak bias.
    // Penjualan dijumlah dari kolom totalBersih header (impor REKAP BGA mengisi
    // totalBersih, bukan penjualan_detail, jadi pakai detail akan mengurangi-hitung).
    db.select({ total: sum(penjualan.totalBersih) })
      .from(penjualan)
      .where(and(gte(penjualan.tanggal, dari), lte(penjualan.tanggal, sampai))),

    db.select({ total: sum(biayaOperasional.jumlah) })
      .from(biayaOperasional)
      .where(and(gte(biayaOperasional.tanggal, dari), lte(biayaOperasional.tanggal, sampai))),

    db.select().from(akunKas).orderBy(akunKas.urutan),

    db.query.transaksiKas.findMany({
      where: (t, { and, gte, lte }) => and(gte(t.tanggal, dari), lte(t.tanggal, sampai)),
      orderBy: (t, { asc }) => [asc(t.tanggal), asc(t.createdAt)],
      with: { akun: true },
    }),

    db.query.pembelian.findMany({
      where: (p, { and, gte, lte }) => and(gte(p.tanggal, dari), lte(p.tanggal, sampai)),
      with: { peron: true },
    }),

    db.select({ peronId: modalPeron.peronId, jenis: modalPeron.jenis, total: sum(modalPeron.jumlah) })
      .from(modalPeron)
      .groupBy(modalPeron.peronId, modalPeron.jenis),

    db.select().from(peron).orderBy(asc(peron.nama)),
  ])

  // Saldo awal per akun (sebelum periode)
  const saldoAwalRows = await Promise.all(
    allAkun.map(async (a) => {
      const rows = await db.select({ arah: transaksiKas.arah, total: sum(transaksiKas.jumlah) })
        .from(transaksiKas)
        .where(and(eq(transaksiKas.akunId, a.id), lt(transaksiKas.tanggal, dari)))
        .groupBy(transaksiKas.arah)
      const masuk = Number(rows.find((r) => r.arah === 'masuk')?.total ?? 0)
      const keluar = Number(rows.find((r) => r.arah === 'keluar')?.total ?? 0)
      return { id: a.id, nama: a.nama, tipe: a.tipe, saldoAwal: a.saldoAwal + masuk - keluar }
    })
  )

  const dpMap: Record<string, number> = {}
  for (const row of dpRows) {
    const val = Number(row.total ?? 0)
    dpMap[row.peronId] = (dpMap[row.peronId] ?? 0) + (row.jenis === 'tambah' ? val : -val)
  }

  const peronMap: Record<string, {
    id: string; nama: string
    totalBeli: number; keuntungan: number; jumlahTiket: number; dpAktif: number
    tonase: number; targetPerKg: number
  }> = {}
  for (const p of allPeron) {
    peronMap[p.id] = {
      id: p.id, nama: p.nama,
      totalBeli: 0, keuntungan: 0, jumlahTiket: 0,
      dpAktif: dpMap[p.id] ?? 0,
      tonase: 0, targetPerKg: p.keuntunganPerKg,
    }
  }
  for (const pb of pembelianList) {
    if (!peronMap[pb.peronId]) continue
    peronMap[pb.peronId].totalBeli += pb.totalBeli
    peronMap[pb.peronId].keuntungan += pb.keuntungan
    peronMap[pb.peronId].tonase += pb.tonase
    peronMap[pb.peronId].jumlahTiket++
  }

  const totalPenjualan = Number(penjualanTotalRow[0]?.total ?? 0)
  const totalPembelian = pembelianList.reduce((s, p) => s + p.totalBeli, 0)
  const totalBiaya = Number(biayaTotalRow[0]?.total ?? 0)
  const totalKeuntungan = pembelianList.reduce((s, p) => s + p.keuntungan, 0)
  const totalTonase = pembelianList.reduce((s, p) => s + p.tonase, 0)
  // Margin BERSIH OCM = markup peron (totalKeuntungan) − biaya operasional OCM
  // sendiri. Beda dari totalKeuntungan yang "sebelum biaya". Break-even volume =
  // berapa kg harus ditangani agar markup menutup biaya. Per-kg = realisasi/kg.
  const marginBersih = totalKeuntungan - totalBiaya
  const markupPerKg = totalTonase > 0 ? totalKeuntungan / totalTonase : 0
  const marginBersihPerKg = totalTonase > 0 ? Math.round(marginBersih / totalTonase) : 0
  const breakEvenVolumeKg = markupPerKg > 0 ? Math.round(totalBiaya / markupPerKg) : 0

  // Kelompokkan transaksi: tunai (untuk "Buku Kas") dan bank (untuk "Mutasi Bank")
  const kasTransaksiTunai = kasTransaksi.filter((t) => t.akun?.tipe === 'tunai')
  const kasTransaksiBank = kasTransaksi.filter((t) => t.akun?.tipe === 'bank')
  const saldoAwalTunai = saldoAwalRows.filter((a) => a.tipe === 'tunai').reduce((s, a) => s + a.saldoAwal, 0)
  const saldoAwalBank = saldoAwalRows.filter((a) => a.tipe === 'bank').reduce((s, a) => s + a.saldoAwal, 0)

  return {
    labaRugi: {
      totalPenjualan,
      totalPembelian,
      totalBiaya,
      labaBersih: totalPenjualan - totalPembelian - totalBiaya,
      totalKeuntungan,
      totalTonase,
      marginBersih,
      marginBersihPerKg,
      breakEvenVolumeKg,
    },
    laporanPeron: Object.values(peronMap)
      .filter((p) => p.totalBeli > 0 || p.dpAktif > 0)
      // Margin riil/kg per peron (realisasi) untuk dibandingkan ke target keuntunganPerKg.
      .map((p) => ({ ...p, realizedPerKg: p.tonase > 0 ? Math.round(p.keuntungan / p.tonase) : 0 })),
    saldoAwalKas: saldoAwalTunai,
    saldoAwalBri: saldoAwalBank,
    kasTransaksi: kasTransaksiTunai,
    briTransaksi: kasTransaksiBank,
    akunSaldoAwal: saldoAwalRows,
  }
}

// Laporan pembelian bulanan: rekap tonase & nilai pembelian per peron dan per
// kategori untuk SATU bulan. Fokus operasional (berapa kg tiap peron sebulan),
// terpisah dari laba-rugi. `bulan` = 'YYYY-MM'.
export async function getPembelianBulanan(bulan: string) {
  await requireFinanceAccess()

  // Rentang teks '-01'..'-31' meliputi semua hari bulan (perbandingan leksikografis ISO;
  // '2026-06-31' > tanggal apa pun di Juni meski bukan tanggal valid).
  const dari = `${bulan}-01`
  const sampai = `${bulan}-31`

  const [pembelianList, allPeron] = await Promise.all([
    db.query.pembelian.findMany({
      where: (p, { and, gte, lte }) => and(gte(p.tanggal, dari), lte(p.tanggal, sampai)),
    }),
    db.select().from(peron).orderBy(asc(peron.nama)),
  ])

  const peronMap: Record<string, {
    id: string; nama: string; tonase: number; totalBeli: number
    keuntungan: number; jumlahTiket: number; targetPerKg: number
  }> = {}
  for (const p of allPeron) {
    peronMap[p.id] = {
      id: p.id, nama: p.nama, tonase: 0, totalBeli: 0,
      keuntungan: 0, jumlahTiket: 0, targetPerKg: p.keuntunganPerKg,
    }
  }

  const kategoriMap: Record<string, {
    kategori: string; tonase: number; totalBeli: number; keuntungan: number; jumlahTiket: number
  }> = {}

  for (const pb of pembelianList) {
    const pr = peronMap[pb.peronId]
    if (pr) {
      pr.tonase += pb.tonase
      pr.totalBeli += pb.totalBeli
      pr.keuntungan += pb.keuntungan
      pr.jumlahTiket++
    }
    if (!kategoriMap[pb.kategori]) {
      kategoriMap[pb.kategori] = { kategori: pb.kategori, tonase: 0, totalBeli: 0, keuntungan: 0, jumlahTiket: 0 }
    }
    const kt = kategoriMap[pb.kategori]
    kt.tonase += pb.tonase
    kt.totalBeli += pb.totalBeli
    kt.keuntungan += pb.keuntungan
    kt.jumlahTiket++
  }

  const perPeron = Object.values(peronMap)
    .filter((p) => p.jumlahTiket > 0)
    .map((p) => ({ ...p, realizedPerKg: p.tonase > 0 ? Math.round(p.keuntungan / p.tonase) : 0 }))
    .sort((a, b) => b.tonase - a.tonase)

  const perKategori = Object.values(kategoriMap).sort((a, b) => b.tonase - a.tonase)

  return {
    bulan,
    perPeron,
    perKategori,
    total: {
      tonase: pembelianList.reduce((s, p) => s + p.tonase, 0),
      totalBeli: pembelianList.reduce((s, p) => s + p.totalBeli, 0),
      keuntungan: pembelianList.reduce((s, p) => s + p.keuntungan, 0),
      jumlahTiket: pembelianList.length,
    },
  }
}

export async function getPajakData(tahun: string) {
  await requireFinanceAccess()

  const [ppnRows, pphRows, penjualanRows, tarifPpnRow] = await Promise.all([
    db.select().from(ppnBulanan).where(like(ppnBulanan.bulan, `${tahun}-%`)).orderBy(asc(ppnBulanan.bulan)),
    db.select().from(pphBulanan).where(like(pphBulanan.bulan, `${tahun}-%`)).orderBy(asc(pphBulanan.bulan)),
    db.query.penjualan.findMany({
      where: (t, { and, gte, lte, eq }) => and(
        gte(t.tanggal, `${tahun}-01-01`),
        lte(t.tanggal, `${tahun}-12-31`),
        eq(t.statusBayar, 'lunas'),
      ),
    }),
    db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, 'tax_tarif_ppn')),
  ])

  // Tarif PPN dari pengaturan (persen tersimpan mis. "11"); kosong/tak valid → default 11%.
  const tarifPpn = parseTarifPersen(tarifPpnRow[0]?.value, TARIF_PPN)

  const ppnPerBulan: Record<string, { totalPenjualan: number; ppn: number; status: 'belum' | 'sudah'; tanggalSetor: string | null }> = {}
  for (let m = 1; m <= 12; m++) {
    const bulan = `${tahun}-${String(m).padStart(2, '0')}`
    const penjualanBulan = penjualanRows.filter(p => p.tanggal.startsWith(bulan))
    const totalPenjualan = penjualanBulan.reduce((s, p) => s + (p.totalBersih ?? 0), 0)
    const ppnRecord = ppnRows.find(r => r.bulan === bulan)
    ppnPerBulan[bulan] = {
      totalPenjualan,
      ppn: hitungPpn(totalPenjualan, tarifPpn),
      status: ppnRecord?.statusSetor ?? 'belum',
      tanggalSetor: ppnRecord?.tanggalSetor ?? null,
    }
  }

  const pphPerBulan: Record<string, { nominal: number; status: 'belum' | 'sudah'; tanggalBayar: string | null }> = {}
  for (let m = 1; m <= 12; m++) {
    const bulan = `${tahun}-${String(m).padStart(2, '0')}`
    const pphRecord = pphRows.find(r => r.bulan === bulan)
    pphPerBulan[bulan] = {
      nominal: pphRecord?.nominal ?? DEFAULT_PPH25_NOMINAL,
      status: pphRecord?.statusBayar ?? 'belum',
      tanggalBayar: pphRecord?.tanggalBayar ?? null,
    }
  }

  return { ppnPerBulan, pphPerBulan }
}

export async function getLabaRugiTahunan(tahun: string) {
  await requireFinanceAccess()

  const dari = `${tahun}-01-01`
  const sampai = `${tahun}-12-31`

  const [penjualanTotal, pembelianTotal, biayaTotal, pphRows, tarifPphRow] = await Promise.all([
    // Basis AKRUAL: semua penjualan & semua pembelian dalam tahun berjalan,
    // simetris (tidak menyaring 'lunas') agar laba & estimasi PPh tidak bias.
    db.select({ total: sum(penjualan.totalBersih) })
      .from(penjualan)
      .where(and(gte(penjualan.tanggal, dari), lte(penjualan.tanggal, sampai))),
    db.select({ total: sum(pembelian.totalBeli) })
      .from(pembelian)
      .where(and(gte(pembelian.tanggal, dari), lte(pembelian.tanggal, sampai))),
    db.select({ total: sum(biayaOperasional.jumlah) })
      .from(biayaOperasional)
      .where(and(gte(biayaOperasional.tanggal, dari), lte(biayaOperasional.tanggal, sampai))),
    db.select().from(pphBulanan).where(like(pphBulanan.bulan, `${tahun}-%`)),
    db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, 'tax_tarif_pph_badan')),
  ])

  // Tarif PPh Badan dari pengaturan (persen tersimpan mis. "22"); kosong/tak valid → default 22%.
  const tarifPphBadan = parseTarifPersen(tarifPphRow[0]?.value, TARIF_PPH_BADAN)

  const totalPenjualan = Number(penjualanTotal[0]?.total ?? 0)
  const totalPembelian = Number(pembelianTotal[0]?.total ?? 0)
  const totalBiaya = Number(biayaTotal[0]?.total ?? 0)
  const labaKotor = totalPenjualan - totalPembelian
  const labaOperasional = labaKotor - totalBiaya
  // Rugi → PPh Badan 0 (tidak boleh negatif; kerugian dikompensasi, bukan jadi "pajak negatif").
  const pphBadan = hitungPphBadan(labaOperasional, tarifPphBadan)
  const labaBersih = labaOperasional - pphBadan
  const totalPph25Dibayar = pphRows.filter(r => r.statusBayar === 'sudah').reduce((s, r) => s + r.nominal, 0)
  const pphKurangBayar = pphBadan - totalPph25Dibayar

  return {
    totalPenjualan, totalPembelian, labaKotor, totalBiaya,
    labaOperasional, pphBadan, labaBersih, totalPph25Dibayar, pphKurangBayar,
  }
}

export async function getNeracaData() {
  await requireFinanceAccess()

  const [allAkun, allTransaksi, piutangRows, dpRows, ppnRows, pphRows, pembelianTotal, penjualanTotal, biayaTotal, modalAwalRow] = await Promise.all([
    db.select().from(akunKas).orderBy(akunKas.urutan),
    db.select({ akunId: transaksiKas.akunId, arah: transaksiKas.arah, total: sum(transaksiKas.jumlah) })
      .from(transaksiKas).groupBy(transaksiKas.akunId, transaksiKas.arah),
    db.select({ total: sum(penjualan.totalBersih) }).from(penjualan).where(eq(penjualan.statusBayar, 'belum')),
    db.select({ jenis: modalPeron.jenis, total: sum(modalPeron.jumlah) })
      .from(modalPeron)
      .innerJoin(peron, and(eq(modalPeron.peronId, peron.id), eq(peron.status, 'aktif')))
      .groupBy(modalPeron.jenis),
    db.select().from(ppnBulanan).where(eq(ppnBulanan.statusSetor, 'belum')),
    db.select().from(pphBulanan).where(eq(pphBulanan.statusBayar, 'belum')),
    db.select({ total: sum(pembelian.totalBeli) }).from(pembelian),
    // Basis AKRUAL: laba ditahan pakai SEMUA penjualan (lunas + belum). Piutang
    // (penjualan belum lunas) tetap jadi aset terpisah di atas — konsisten
    // dengan akrual (jurnal: debit piutang, kredit pendapatan), bukan dobel-hitung.
    db.select({ total: sum(penjualan.totalBersih) }).from(penjualan),
    db.select({ total: sum(biayaOperasional.jumlah) }).from(biayaOperasional),
    db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, 'neraca_modal_awal')),
  ])

  // Modal awal pemilik untuk neraca — disimpan server-side (sinkron lintas perangkat).
  const modalAwal = Number(modalAwalRow[0]?.value ?? '0') || 0

  const mutasiPerAkun: Record<string, number> = {}
  for (const r of allTransaksi) {
    mutasiPerAkun[r.akunId] = (mutasiPerAkun[r.akunId] ?? 0) + (r.arah === 'masuk' ? Number(r.total ?? 0) : -Number(r.total ?? 0))
  }
  const totalKasBank = allAkun.reduce((s, a) => s + a.saldoAwal + (mutasiPerAkun[a.id] ?? 0), 0)

  const piutangBga = Number(piutangRows[0]?.total ?? 0)

  const dpTambah = Number(dpRows.find(r => r.jenis === 'tambah')?.total ?? 0)
  const dpKurang = Number(dpRows.find(r => r.jenis === 'kurang')?.total ?? 0)
  const dpKembali = Number(dpRows.find(r => r.jenis === 'kembali')?.total ?? 0)
  const dpPeron = dpTambah - dpKurang - dpKembali

  const totalAset = totalKasBank + piutangBga + dpPeron

  const hutangPpn = ppnRows.reduce((s, r) => s + r.totalPpn, 0)
  const hutangPph = pphRows.reduce((s, r) => s + r.nominal, 0)
  const totalKewajiban = hutangPpn + hutangPph

  const totalPenjualanVal = Number(penjualanTotal[0]?.total ?? 0)
  const totalPembelianVal = Number(pembelianTotal[0]?.total ?? 0)
  const totalBiayaVal = Number(biayaTotal[0]?.total ?? 0)
  const labaDitahan = totalPenjualanVal - totalPembelianVal - totalBiayaVal

  return {
    aset: { kasBank: totalKasBank, piutangBga, dpPeron, total: totalAset },
    kewajiban: { hutangPpn, hutangPph, total: totalKewajiban },
    ekuitas: { labaDitahan, total: labaDitahan },
    modalAwal,
    balance: totalAset === totalKewajiban + labaDitahan,
    selisih: totalAset - (totalKewajiban + labaDitahan),
  }
}
