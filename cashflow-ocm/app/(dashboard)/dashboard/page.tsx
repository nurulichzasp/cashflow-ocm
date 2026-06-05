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

  const piutangBga = Number(piutangBelumRaw?.[0]?.total ?? 0)
  const totalPenjualanLunas = Number(penjualanLunasRaw?.[0]?.total ?? 0)
  const totalModalBerputar = totalSaldo + totalDpPeron + piutangBga

  const estimasiLaba = Number(pembelianKeuntungan?.[0]?.total ?? 0)

  return { akunSaldo, totalSaldo, totalDpPeron, piutangBga, totalPenjualanLunas, totalModalBerputar, estimasiLaba }
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
    db.select({ total: sum(penjualan.totalBersih) })
      .from(penjualan)
      .where(eq(penjualan.tanggal, today)),
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
      icon: <Banknote className="h-5 w-5 text-green-600 dark:text-[#9CA3AF]" />,
      iconBg: 'bg-green-50 dark:bg-white/[0.04]',
      borderColor: 'border-l-green-500',
    },
    {
      title: 'Total DP Peron',
      value: formatRupiah(metrics.totalDpPeron),
      icon: <TrendingDown className="h-5 w-5 text-amber-600 dark:text-[#9CA3AF]" />,
      iconBg: 'bg-amber-50 dark:bg-white/[0.04]',
      borderColor: 'border-l-amber-500',
    },
    {
      title: 'Piutang BGA',
      value: formatRupiah(metrics.piutangBga),
      icon: <TrendingUp className="h-5 w-5 text-violet-600 dark:text-[#9CA3AF]" />,
      iconBg: 'bg-violet-50 dark:bg-white/[0.04]',
      borderColor: 'border-l-violet-500',
    },
    {
      title: 'Total Penjualan Lunas',
      value: formatRupiah(metrics.totalPenjualanLunas),
      icon: <Receipt className="h-5 w-5 text-emerald-600 dark:text-[#9CA3AF]" />,
      iconBg: 'bg-emerald-50 dark:bg-white/[0.04]',
      borderColor: 'border-l-emerald-500',
    },
    {
      title: 'Total Modal Berputar',
      value: formatRupiah(metrics.totalModalBerputar),
      icon: <BarChart3 className="h-5 w-5 text-orange-600 dark:text-[#D97757]" />,
      iconBg: 'bg-orange-100 dark:bg-[#D97757]/12',
      borderColor: 'border-l-orange-600',
      highlight: true,
    },
    {
      title: 'Estimasi Laba',
      value: formatRupiah(metrics.estimasiLaba),
      icon: <TrendingUp className="h-5 w-5 text-green-600 dark:text-[#D97757]" />,
      iconBg: 'bg-green-50 dark:bg-[#D97757]/12',
      borderColor: 'border-l-green-400',
      highlight: true,
    },
  ]

  const todayItems = [
    {
      label: 'Pembelian Hari Ini',
      value: formatRupiah(today.pembelianHariIni),
      icon: ShoppingCart,
      color: 'text-red-600 dark:text-[#9CA3AF]',
    },
    {
      label: 'Penjualan Hari Ini',
      value: formatRupiah(today.penjualanHariIni),
      icon: TrendingUp,
      color: 'text-green-600 dark:text-[#F3F4F6]',
    },
    {
      label: 'Biaya Hari Ini',
      value: formatRupiah(today.biayaHariIni),
      icon: Receipt,
      color: 'text-amber-600 dark:text-[#D97757]',
    },
  ]

  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Kelompokkan akun: Rek BRI CV OCM tampil sendiri, sisanya digabung
  const akunCvOcm = metrics.akunSaldo.find((a) => a.nama.toLowerCase().includes('cv ocm'))
  const akunLainnya = metrics.akunSaldo.filter((a) => a.tipe === 'bank' && !a.nama.toLowerCase().includes('cv ocm'))
  const akunTunai = metrics.akunSaldo.filter((a) => a.tipe === 'tunai')
  const saldoLainnya = akunLainnya.reduce((s, a) => s + a.saldo, 0)

  return (
    <div className="space-y-6 pt-1 md:pt-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">Dashboard</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          {tanggal} &mdash; Selamat datang, {session?.user.name}
        </p>
      </div>
      {/* Mobile greeting */}
      <div className="md:hidden">
        <p className="text-sm text-stone-500">{tanggal}</p>
      </div>

      {/* Ringkasan Hari Ini */}
      <div className="rounded-xl border border-stone-100 dark:border-border bg-white dark:bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-50 dark:border-border flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 dark:bg-[#4B5563]" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-[#6B7280]">Hari Ini</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-stone-50 dark:divide-border">
          {todayItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between px-5 py-4 sm:flex-col sm:items-start sm:py-5">
              <div className="flex items-center gap-1.5">
                <item.icon className={`h-3.5 w-3.5 ${item.color} shrink-0`} />
                <p className="text-xs text-stone-400 dark:text-[#6B7280] font-medium">{item.label}</p>
              </div>
              <p className={`text-xl font-bold num tracking-tight ${item.color} sm:mt-2.5`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Saldo per akun */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-[#6B7280] mb-3">Saldo Rekening &amp; Kas</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Rek BRI CV OCM — utama */}
          {akunCvOcm && (
            <div className="rounded-xl border border-orange-200/70 dark:border-[#D97757]/20 bg-orange-50/50 dark:bg-card dark:bg-none p-4">
              <p className="text-[10px] font-semibold text-orange-500 dark:text-[#D97757] uppercase tracking-widest mb-2">Rekening Utama</p>
              <p className="text-[11px] text-stone-400 dark:text-[#6B7280] mb-1.5 truncate">{akunCvOcm.nama}</p>
              <p className={`text-xl font-bold num tracking-tight ${akunCvOcm.saldo >= 0 ? 'text-stone-900 dark:text-stone-100' : 'text-red-600 dark:text-red-400'}`}>
                {formatRupiah(akunCvOcm.saldo)}
              </p>
            </div>
          )}
          {/* Rekening BRI lainnya — digabung */}
          {akunLainnya.length > 0 && (
            <div className="rounded-xl border border-stone-100 dark:border-border bg-white dark:bg-card p-4">
              <p className="text-[10px] font-semibold text-stone-400 dark:text-[#6B7280] uppercase tracking-widest mb-2">Bank</p>
              <p className="text-[11px] text-stone-400 dark:text-[#6B7280] mb-1.5">Rek BRI Lainnya</p>
              <p className={`text-xl font-bold num tracking-tight ${saldoLainnya >= 0 ? 'text-stone-900 dark:text-stone-100' : 'text-red-600 dark:text-red-400'}`}>
                {formatRupiah(saldoLainnya)}
              </p>
              <p className="text-[10px] text-stone-300 dark:text-[#4B5563] mt-2 truncate">{akunLainnya.map((a) => a.nama).join(' · ')}</p>
            </div>
          )}
          {/* Tunai */}
          {akunTunai.map((a) => (
            <div key={a.id} className="rounded-xl border border-stone-100 dark:border-border bg-white dark:bg-card p-4">
              <p className="text-[10px] font-semibold text-stone-400 dark:text-[#6B7280] uppercase tracking-widest mb-2">Tunai</p>
              <p className="text-[11px] text-stone-400 dark:text-[#6B7280] mb-1.5 truncate">{a.nama}</p>
              <p className={`text-xl font-bold num tracking-tight ${a.saldo >= 0 ? 'text-stone-900 dark:text-stone-100' : 'text-red-600 dark:text-red-400'}`}>
                {formatRupiah(a.saldo)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="rounded-xl border border-stone-100 dark:border-border bg-white dark:bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-50 dark:border-border">
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">Cashflow Harian</p>
              <p className="text-xs text-stone-400 dark:text-[#6B7280] mt-0.5">Masuk vs keluar — 14 hari terakhir</p>
            </div>
            <div className="p-4">
              <CashflowChart data={charts.daily} />
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-xl border border-stone-100 dark:border-border bg-white dark:bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-50 dark:border-border">
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">Komposisi Modal</p>
              <p className="text-xs text-stone-400 dark:text-[#6B7280] mt-0.5">Bank, Tunai, DP Peron, Piutang</p>
            </div>
            <div className="p-4">
              <CompositionChart data={charts.composition} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-stone-100 dark:border-border bg-white dark:bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-50 dark:border-border">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">Tren Modal Berputar</p>
          <p className="text-xs text-stone-400 dark:text-[#6B7280] mt-0.5">Perkembangan modal selama 14 hari terakhir</p>
        </div>
        <div className="p-4">
          <TrendChart data={charts.trend} />
        </div>
      </div>
    </div>
  )
}
