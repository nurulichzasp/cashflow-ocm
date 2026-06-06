'use server'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  transaksiKas, biayaOperasional, penjualan,
  pembelian, peron, modalPeron, akunKas,
} from '@/lib/db/schema'
import { eq, sum, and, gte, lte, lt, asc } from 'drizzle-orm'

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Tidak terautentikasi')
  return session
}

export async function getLaporanData(dari: string, sampai: string) {
  await requireSession()

  const [
    penjualanTotalRow,
    biayaTotalRow,
    allAkun,
    kasTransaksi,
    pembelianList,
    dpRows,
    allPeron,
  ] = await Promise.all([
    // Penjualan dijumlah dari kolom totalBersih di header. Impor REKAP BGA
    // mengisi totalBersih (bukan baris penjualan_detail), jadi memakai detail
    // akan mengurangi-hitung. Samakan dengan sumber data dashboard.
    db.select({ total: sum(penjualan.totalBersih) })
      .from(penjualan)
      .where(and(eq(penjualan.statusBayar, 'lunas'), gte(penjualan.tanggal, dari), lte(penjualan.tanggal, sampai))),

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
  }> = {}
  for (const p of allPeron) {
    peronMap[p.id] = {
      id: p.id, nama: p.nama,
      totalBeli: 0, keuntungan: 0, jumlahTiket: 0,
      dpAktif: dpMap[p.id] ?? 0,
    }
  }
  for (const pb of pembelianList) {
    if (!peronMap[pb.peronId]) continue
    peronMap[pb.peronId].totalBeli += pb.totalBeli
    peronMap[pb.peronId].keuntungan += pb.keuntungan
    peronMap[pb.peronId].jumlahTiket++
  }

  const totalPenjualan = Number(penjualanTotalRow[0]?.total ?? 0)
  const totalPembelian = pembelianList.reduce((s, p) => s + p.totalBeli, 0)
  const totalBiaya = Number(biayaTotalRow[0]?.total ?? 0)
  const totalKeuntungan = pembelianList.reduce((s, p) => s + p.keuntungan, 0)

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
    },
    laporanPeron: Object.values(peronMap).filter((p) => p.totalBeli > 0 || p.dpAktif > 0),
    saldoAwalKas: saldoAwalTunai,
    saldoAwalBri: saldoAwalBank,
    kasTransaksi: kasTransaksiTunai,
    briTransaksi: kasTransaksiBank,
    akunSaldoAwal: saldoAwalRows,
  }
}
