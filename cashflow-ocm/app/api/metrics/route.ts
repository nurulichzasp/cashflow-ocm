import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { headers } from 'next/headers'
import { eq, sum, and } from 'drizzle-orm'
import { hasUserPermission, moduleKeys } from '@/lib/permissions'
import { todayString } from '@/lib/format'
import {
  transaksiKas,
  pembelian,
  penjualan,
  modalPeron,
  peron,
  akunKas,
  biayaOperasional,
} from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Metrik ini berisi seluruh angka keuangan (saldo, piutang, laba). Batasi
    // ke peran yang memang boleh melihat data keuangan — role tanpa hak
    // (mis. kasir / peran tak dikenal) tidak boleh menariknya.
    if (!moduleKeys.every((module) => hasUserPermission(session.user, 'canViewFinance', module))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current metrics
    const [akunList, transaksiRows, modalRows, piutangBelumRaw, penjualanLunasRaw, pembelianKeuntungan] =
      await Promise.all([
        db.select().from(akunKas).orderBy(akunKas.urutan),

        db.select({ akunId: transaksiKas.akunId, arah: transaksiKas.arah, total: sum(transaksiKas.jumlah) })
          .from(transaksiKas)
          .groupBy(transaksiKas.akunId, transaksiKas.arah),

        db.select({ jenis: modalPeron.jenis, total: sum(modalPeron.jumlah) })
          .from(modalPeron)
          .innerJoin(peron, and(eq(modalPeron.peronId, peron.id), eq(peron.status, 'aktif')))
          .groupBy(modalPeron.jenis),

        db.select({ total: sum(penjualan.totalBersih) })
          .from(penjualan)
          .where(eq(penjualan.statusBayar, 'belum')),

        db.select({ total: sum(penjualan.totalBersih) })
          .from(penjualan)
          .where(eq(penjualan.statusBayar, 'lunas')),

        db.select({ total: sum(pembelian.keuntungan) })
          .from(pembelian),
      ])

    // Calculate mutasi per akun
    const mutasiPerAkun: Record<string, number> = {}
    for (const r of transaksiRows) {
      const prev = mutasiPerAkun[r.akunId] ?? 0
      mutasiPerAkun[r.akunId] = prev + (r.arah === 'masuk' ? Number(r.total ?? 0) : -Number(r.total ?? 0))
    }

    const akunSaldo = akunList.map((a) => ({
      ...a,
      saldo: a.saldoAwal + (mutasiPerAkun[a.id] ?? 0),
    }))

    const totalSaldoBank = akunSaldo.filter((a) => a.tipe === 'bank').reduce((s, a) => s + a.saldo, 0)
    const totalSaldoTunai = akunSaldo.filter((a) => a.tipe === 'tunai').reduce((s, a) => s + a.saldo, 0)
    const totalSaldo = totalSaldoBank + totalSaldoTunai

    const dpTambah = Number(modalRows.find((r) => r.jenis === 'tambah')?.total ?? 0)
    const dpKurang = Number(modalRows.find((r) => r.jenis === 'kurang')?.total ?? 0)
    const dpKembali = Number(modalRows.find((r) => r.jenis === 'kembali')?.total ?? 0)
    const totalDpPeron = dpTambah - dpKurang - dpKembali

    const piutangBga = Number(piutangBelumRaw?.[0]?.total ?? 0)
    const totalPenjualanLunas = Number(penjualanLunasRaw?.[0]?.total ?? 0)
    const totalModalBerputar = totalSaldo + totalDpPeron + piutangBga

    const estimasiLaba = Number(pembelianKeuntungan?.[0]?.total ?? 0)

    // Get today stats — tanggal WIB (Asia/Jakarta), bukan UTC server. Kolom
    // `tanggal` disimpan sebagai tanggal WIB, jadi UTC bikin KPI "hari ini"
    // meleset ~00:00–07:00 WIB (server masih "kemarin").
    const today = todayString()
    const [pembeliRows, penjualRows, biayaRows] = await Promise.all([
      db.select({ total: sum(transaksiKas.jumlah) })
        .from(transaksiKas)
        .where(and(
          eq(transaksiKas.tanggal, today),
          eq(transaksiKas.kategori, 'bayar_peron'),
          eq(transaksiKas.arah, 'keluar'),
        )),
      db.select({ total: sum(penjualan.totalBersih) })
        .from(penjualan)
        .where(eq(penjualan.tanggal, today)),
      db.select({ total: sum(biayaOperasional.jumlah) })
        .from(biayaOperasional)
        .where(eq(biayaOperasional.tanggal, today)),
    ])

    return Response.json({
      totalSaldo,
      totalDpPeron,
      piutangBga,
      totalModalBerputar,
      totalPenjualanLunas,
      estimasiLaba,
      pembelianHariIni: Number(pembeliRows[0]?.total ?? 0),
      penjualanHariIni: Number(penjualRows[0]?.total ?? 0),
      biayaHariIni: Number(biayaRows[0]?.total ?? 0),
      akunSaldo,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch metrics:', error)
    return Response.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}
