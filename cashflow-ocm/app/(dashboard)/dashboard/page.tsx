export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  transaksiKas,
  pembelian,
  penjualan,
  modalPeron,
  peron,
  biayaOperasional,
  akunKas,
} from '@/lib/db/schema'
import { eq, sum, and, gte } from 'drizzle-orm'
import { formatRupiah } from '@/lib/format'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Banknote,
  BarChart3,
  ShoppingCart,
  Receipt,
} from 'lucide-react'
import { MetricCard } from '@/components/metric-card'
import CashflowChart from '@/components/charts/CashflowChart'
import TrendChart from '@/components/charts/TrendChart'
import CompositionChart from '@/components/charts/CompositionChart'

async function getMetrics() {
  const [akunList, transaksiRows, modalRows, piutangBgaRaw, penjualanList, pembelianKeuntungan] =
    await Promise.all([
      db.select().from(akunKas).orderBy(akunKas.urutan),

      db.select({ akunId: transaksiKas.akunId, arah: transaksiKas.arah, total: sum(transaksiKas.jumlah) })
        .from(transaksiKas)
        .groupBy(transaksiKas.akunId, transaksiKas.arah),

      db.select({ jenis: modalPeron.jenis, total: sum(modalPeron.jumlah) })
        .from(modalPeron)
        .innerJoin(peron, and(eq(modalPeron.peronId, peron.id), eq(peron.status, 'aktif')))
        .groupBy(modalPeron.jenis),

      db.select({ total: sum(transaksiKas.jumlah) })
        .from(transaksiKas)
        .where(and(eq(transaksiKas.kategori, 'penerimaan_bga'), eq(transaksiKas.arah, 'masuk'))),

      db.select({ statusBayar: penjualan.statusBayar })
        .from(penjualan),

      db.select({ total: sum(pembelian.keuntungan) })
        .from(pembelian),
    ])

  // Saldo per akun = saldoAwal + mutasi
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

  const piutangBga = Number(piutangBgaRaw?.[0]?.total ?? 0)
  const totalModalBerputar = totalSaldo + totalDpPeron + piutangBga

  const estimasiLaba = Number(pembelianKeuntungan?.[0]?.total ?? 0)

  return { akunSaldo, totalSaldo, totalDpPeron, piutangBga, totalModalBerputar, estimasiLaba }
}

async function getTodayStats() {
  const today = new Date().toISOString().slice(0, 10)
  const [pembeliRows, penjualRows, biayaRows] = await Promise.all([
    db.select({ total: sum(transaksiKas.jumlah) })
      .from(transaksiKas)
      .where(and(
        eq(transaksiKas.tanggal, today),
        eq(transaksiKas.kategori, 'bayar_peron'),
        eq(transaksiKas.arah, 'keluar'),
      )),
    db.select({ total: sum(transaksiKas.jumlah) })
      .from(transaksiKas)
      .where(and(
        eq(transaksiKas.tanggal, today),
        eq(transaksiKas.kategori, 'penerimaan_bga'),
        eq(transaksiKas.arah, 'masuk'),
      )),
    db.select({ total: sum(biayaOperasional.jumlah) })
      .from(biayaOperasional)
      .where(eq(biayaOperasional.tanggal, today)),
  ])
  return {
    pembelianHariIni: Number(pembeliRows[0]?.total ?? 0),
    penjualanHariIni: Number(penjualRows[0]?.total ?? 0),
    biayaHariIni: Number(biayaRows[0]?.total ?? 0),
  }
}

async function getChartSeries(days = 14) {
  const end = new Date()
  const startDate = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
  const startStr = startDate.toISOString().slice(0, 10)

  const [transaksi, modalRows, akunList] = await Promise.all([
    db.select().from(transaksiKas).where(gte(transaksiKas.tanggal, startStr)).orderBy(transaksiKas.tanggal),
    db.select().from(modalPeron).where(gte(modalPeron.tanggal, startStr)).orderBy(modalPeron.tanggal),
    db.select().from(akunKas),
  ])

  const saldoAwalPerAkun: Record<string, number> = {}
  for (const a of akunList) {
    saldoAwalPerAkun[a.id] = a.saldoAwal
  }

  const dates: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    dates.push(d.toISOString().slice(0, 10))
  }

  const daily = dates.map((date) => {
    const rows = transaksi.filter((t: any) => t.tanggal === date)
    const masuk = rows.filter((r: any) => r.arah === 'masuk').reduce((s: number, r: any) => s + Number(r.jumlah ?? 0), 0)
    const keluar = rows.filter((r: any) => r.arah === 'keluar').reduce((s: number, r: any) => s + Number(r.jumlah ?? 0), 0)
    return { date: date.slice(5), masuk, keluar }
  })

  const trend = dates.map((date) => {
    const tUpTo = transaksi.filter((t: any) => t.tanggal <= date)
    const totalKas = Object.entries(saldoAwalPerAkun).reduce((acc, [akunId, saldoAwal]) => {
      const akuMutasi = tUpTo.filter((r: any) => r.akunId === akunId).reduce((s: number, r: any) => s + (r.arah === 'masuk' ? Number(r.jumlah) : -Number(r.jumlah)), 0)
      return acc + saldoAwal + akuMutasi
    }, 0)
    const dpPeron = modalRows.filter((m: any) => m.tanggal <= date).reduce((acc: number, r: any) => acc + (r.jenis === 'tambah' ? Number(r.jumlah) : -Number(r.jumlah)), 0)
    const piutang = tUpTo.filter((r: any) => r.kategori === 'penerimaan_bga' && r.arah === 'masuk').reduce((s: number, r: any) => s + Number(r.jumlah), 0)
    return { date: date.slice(5), total: totalKas + dpPeron + piutang }
  })

  const lastDate = dates[dates.length - 1]
  const transaksiUpTo = transaksi.filter((t: any) => t.tanggal <= lastDate)
  const totalKas = Object.entries(saldoAwalPerAkun).reduce((acc, [akunId, saldoAwal]) => {
    const mut = transaksiUpTo.filter((r: any) => r.akunId === akunId).reduce((s: number, r: any) => s + (r.arah === 'masuk' ? Number(r.jumlah) : -Number(r.jumlah)), 0)
    return acc + saldoAwal + mut
  }, 0)
  const dp = modalRows.reduce((acc: number, r: any) => acc + (r.jenis === 'tambah' ? Number(r.jumlah) : -Number(r.jumlah)), 0)
  const piutang = transaksiUpTo.filter((r: any) => r.kategori === 'penerimaan_bga' && r.arah === 'masuk').reduce((s: number, r: any) => s + Number(r.jumlah), 0)

  const tunaiTotal = akunList.filter((a) => a.tipe === 'tunai').reduce((s, a) => {
    const mut = transaksiUpTo.filter((r: any) => r.akunId === a.id).reduce((acc: number, r: any) => acc + (r.arah === 'masuk' ? Number(r.jumlah) : -Number(r.jumlah)), 0)
    return s + a.saldoAwal + mut
  }, 0)
  const bankTotal = akunList.filter((a) => a.tipe === 'bank').reduce((s, a) => {
    const mut = transaksiUpTo.filter((r: any) => r.akunId === a.id).reduce((acc: number, r: any) => acc + (r.arah === 'masuk' ? Number(r.jumlah) : -Number(r.jumlah)), 0)
    return s + a.saldoAwal + mut
  }, 0)

  return {
    daily,
    trend,
    composition: [
      { name: 'Bank',      value: bankTotal },
      { name: 'Tunai',     value: tunaiTotal },
      { name: 'DP Peron',  value: dp },
      { name: 'Piutang',   value: piutang },
    ],
  }
}

export default async function DashboardPage() {
  const [session, metrics, today, charts] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getMetrics(),
    getTodayStats(),
    getChartSeries(14),
  ])

  const metricCards = [
    {
      title: 'Total Saldo Kas',
      value: formatRupiah(metrics.totalSaldo),
      icon: <Banknote className="h-5 w-5 text-green-600" />,
      iconBg: 'bg-green-50',
      borderColor: 'border-l-green-500',
    },
    {
      title: 'Total DP Peron',
      value: formatRupiah(metrics.totalDpPeron),
      icon: <TrendingDown className="h-5 w-5 text-amber-600" />,
      iconBg: 'bg-amber-50',
      borderColor: 'border-l-amber-500',
    },
    {
      title: 'Piutang BGA',
      value: formatRupiah(metrics.piutangBga),
      icon: <TrendingUp className="h-5 w-5 text-violet-600" />,
      iconBg: 'bg-violet-50',
      borderColor: 'border-l-violet-500',
    },
    {
      title: 'Total Modal Berputar',
      value: formatRupiah(metrics.totalModalBerputar),
      icon: <BarChart3 className="h-5 w-5 text-orange-600" />,
      iconBg: 'bg-orange-100',
      borderColor: 'border-l-orange-600',
      highlight: true,
    },
    {
      title: 'Estimasi Laba',
      value: formatRupiah(metrics.estimasiLaba),
      icon: <TrendingUp className="h-5 w-5 text-green-600" />,
      iconBg: 'bg-green-50',
      borderColor: 'border-l-green-400',
      highlight: true,
    },
  ]

  const todayItems = [
    {
      label: 'Pembelian Hari Ini',
      value: formatRupiah(today.pembelianHariIni),
      icon: ShoppingCart,
      color: 'text-red-600',
    },
    {
      label: 'Penjualan Hari Ini',
      value: formatRupiah(today.penjualanHariIni),
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      label: 'Biaya Hari Ini',
      value: formatRupiah(today.biayaHariIni),
      icon: Receipt,
      color: 'text-amber-600',
    },
  ]

  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {tanggal} &mdash; Selamat datang, {session?.user.name}
        </p>
      </div>

      {/* Ringkasan Hari Ini */}
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Hari Ini</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-stone-100">
          {todayItems.map((item) => (
            <div key={item.label} className="px-5 py-4">
              <div className="flex items-center gap-1.5 mb-2">
                <item.icon className={`h-3.5 w-3.5 ${item.color} shrink-0`} />
                <p className="text-xs text-stone-500 leading-tight">{item.label}</p>
              </div>
              <p className={`text-xl font-bold num ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Saldo per akun */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Saldo Rekening &amp; Kas</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {metrics.akunSaldo.map((a, i) => {
            const colors = ['border-l-green-500', 'border-l-blue-500', 'border-l-violet-500', 'border-l-amber-500', 'border-l-stone-400']
            return (
              <div key={a.id} className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm border-l-4 ${colors[i % colors.length]}`}>
                <p className="text-xs font-semibold text-stone-400 mb-1.5 truncate">{a.nama}</p>
                <p className={`text-lg font-bold num ${a.saldo >= 0 ? 'text-stone-900' : 'text-red-600'}`}>
                  {formatRupiah(a.saldo)}
                </p>
                <p className="text-xs text-stone-400 mt-0.5">{a.tipe === 'bank' ? 'Bank' : 'Tunai'}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metricCards.map((card) => (
          <MetricCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            iconBg={card.iconBg}
            borderColor={card.borderColor}
            highlight={card.highlight}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-100">
              <p className="text-sm font-semibold text-stone-800">Cashflow Harian</p>
              <p className="text-xs text-stone-400">Masuk vs keluar — 14 hari terakhir</p>
            </div>
            <div className="p-4">
              <CashflowChart data={charts.daily} />
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-100">
              <p className="text-sm font-semibold text-stone-800">Komposisi Modal</p>
              <p className="text-xs text-stone-400">Bank, Tunai, DP Peron, Piutang</p>
            </div>
            <div className="p-4">
              <CompositionChart data={charts.composition} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100">
          <p className="text-sm font-semibold text-stone-800">Tren Modal Berputar</p>
          <p className="text-xs text-stone-400">Perkembangan modal selama 14 hari terakhir</p>
        </div>
        <div className="p-4">
          <TrendChart data={charts.trend} />
        </div>
      </div>
    </div>
  )
}
