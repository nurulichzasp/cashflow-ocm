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
  ppnBulanan,
  pphBulanan,
  hargaAcuan,
} from '@/lib/db/schema'
import { eq, sum, and, gte, like, desc, lte } from 'drizzle-orm'
import { formatRupiah, formatTanggal } from '@/lib/format'
import {
  TrendingUp,
  ShoppingCart,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  AlertCircle,
  Clock,
  CircleDollarSign,
} from 'lucide-react'
import CashflowChart from '@/components/charts/CashflowChart'

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

  // Total pembelian (modal terserap) untuk hitung Net Margin
  const totalPembelianRaw = await db.select({ total: sum(pembelian.totalBeli) }).from(pembelian)
  const totalPembelian = Number(totalPembelianRaw?.[0]?.total ?? 0)
  const totalRevenue = totalPenjualanLunas + piutangBga // total nilai bersih semua penjualan
  const netMarginPct = totalPembelian > 0 ? (estimasiLaba / totalPembelian) * 100 : 0

  return {
    akunSaldo, totalSaldo, totalDpPeron, piutangBga,
    totalPenjualanLunas, totalModalBerputar, estimasiLaba,
    totalPembelian, totalRevenue, netMarginPct,
  }
}

/**
 * Smart Insights — analitik kontekstual real-time untuk owner.
 * Hanya munculkan kondisi yang BENAR-BENAR actionable. Sembunyi bila aman.
 */
type Insight = {
  id: string
  tone: 'warn' | 'info' | 'good'
  icon: 'piutang' | 'harga' | 'pajak' | 'margin'
  label: string
  detail?: string
  href?: string
}

async function getSmartInsights(): Promise<Insight[]> {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10)
  const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10)

  const insights: Insight[] = []

  // 1. Piutang umur > 30 hari
  const piutangLama = await db
    .select({ jumlah: penjualan.totalBersih, tanggal: penjualan.tanggal })
    .from(penjualan)
    .where(and(eq(penjualan.statusBayar, 'belum'), lte(penjualan.tanggal, thirtyDaysAgo)))

  if (piutangLama.length > 0) {
    const total = piutangLama.reduce((s, p) => s + (p.jumlah ?? 0), 0)
    insights.push({
      id: 'piutang-lama',
      tone: 'warn',
      icon: 'piutang',
      label: `${piutangLama.length} piutang > 30 hari`,
      detail: formatRupiah(total),
      href: '/penjualan',
    })
  }

  // 2. Harga acuan stale (TBS > 14 hari tidak update)
  const tbsLatest = await db
    .select({ tanggal: hargaAcuan.tanggalBerlaku })
    .from(hargaAcuan)
    .where(eq(hargaAcuan.produk, 'TBS'))
    .orderBy(desc(hargaAcuan.tanggalBerlaku))
    .limit(1)

  if (tbsLatest[0] && tbsLatest[0].tanggal < fourteenDaysAgo) {
    const daysSince = Math.floor(
      (today.getTime() - new Date(tbsLatest[0].tanggal).getTime()) / (24 * 60 * 60 * 1000),
    )
    insights.push({
      id: 'harga-stale',
      tone: 'info',
      icon: 'harga',
      label: `Harga TBS belum diupdate ${daysSince} hari`,
      detail: 'Perbarui acuan pasar',
      href: '/harga',
    })
  }

  // 3. PPN bulan lalu belum disetor & sudah mendekati akhir bulan
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`
  const ppnLast = await db.query.ppnBulanan.findFirst({ where: eq(ppnBulanan.bulan, lastMonth) })
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const dayOfMonth = today.getDate()
  const daysLeft = lastDay - dayOfMonth

  if (ppnLast && ppnLast.statusSetor !== 'sudah' && daysLeft <= 7) {
    insights.push({
      id: 'ppn-jt',
      tone: 'warn',
      icon: 'pajak',
      label: `PPN bulan lalu belum disetor`,
      detail: `JT ${daysLeft} hari lagi`,
      href: '/laporan',
    })
  }

  return insights
}

/** Harga acuan terbaru per produk + selisih hari (untuk Quick Reference card). */
async function getHargaAcuanLatest() {
  const produks = ['TBS', 'BRDL KTWM', 'BRDL TRYM', 'BRDL LMDM'] as const
  const rows = await Promise.all(
    produks.map(async (p) => {
      const r = await db.select().from(hargaAcuan)
        .where(eq(hargaAcuan.produk, p))
        .orderBy(desc(hargaAcuan.tanggalBerlaku))
        .limit(2)
      const current = r[0] ?? null
      const previous = r[1] ?? null
      const delta = current && previous ? current.hargaLapangan - previous.hargaLapangan : 0
      return { produk: p, current, previous, delta }
    })
  )
  return rows
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

async function getTaxStatus() {
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

  const thisMonthStart = `${thisMonth}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const thisMonthEnd = `${thisMonth}-${String(lastDay).padStart(2, '0')}`

  const [ppnThisMonthRows, ppnLastRecord, pphLastRecord] = await Promise.all([
    db.select({ total: sum(penjualan.totalBersih) })
      .from(penjualan)
      .where(and(gte(penjualan.tanggal, thisMonthStart), eq(penjualan.statusBayar, 'lunas'))),
    db.query.ppnBulanan.findFirst({ where: eq(ppnBulanan.bulan, lastMonth) }),
    db.query.pphBulanan.findFirst({ where: eq(pphBulanan.bulan, lastMonth) }),
  ])

  const ppnThisMonth = Math.round(Number(ppnThisMonthRows[0]?.total ?? 0) * 0.11)

  return {
    thisMonth,
    lastMonth,
    ppnThisMonth,
    ppnLastMonth: ppnLastRecord ?? null,
    pphLastMonth: pphLastRecord ?? null,
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
  const [session, metrics, today, charts, tax, hargaLatest, insights] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getMetrics(),
    getTodayStats(),
    getChartSeries(14),
    getTaxStatus(),
    getHargaAcuanLatest(),
    getSmartInsights(),
  ])

  const modalBreakdown = [
    { label: 'Saldo Kas', value: formatRupiah(metrics.totalSaldo) },
    { label: 'DP Peron', value: formatRupiah(metrics.totalDpPeron) },
    { label: 'Piutang', value: formatRupiah(metrics.piutangBga) },
  ]

  const todayItems = [
    {
      label: 'Pembelian Hari Ini',
      value: formatRupiah(today.pembelianHariIni),
      icon: ShoppingCart,
      color: 'text-stone-700 dark:text-zinc-300',
    },
    {
      label: 'Penjualan Hari Ini',
      value: formatRupiah(today.penjualanHariIni),
      icon: TrendingUp,
      color: 'text-[#60A5FA]',
    },
    {
      label: 'Biaya Hari Ini',
      value: formatRupiah(today.biayaHariIni),
      icon: Receipt,
      color: 'text-stone-500 dark:text-zinc-500',
    },
  ]

  // Kelompokkan akun: Rek BRI CV OCM tampil sendiri, sisanya digabung
  const akunCvOcm = metrics.akunSaldo.find((a) => a.nama.toLowerCase().includes('cv ocm'))
  const akunLainnya = metrics.akunSaldo.filter((a) => a.tipe === 'bank' && !a.nama.toLowerCase().includes('cv ocm'))
  const akunTunai = metrics.akunSaldo.filter((a) => a.tipe === 'tunai')

  return (
    <div className="space-y-4 sm:space-y-5 pt-1 md:pt-0">

      {/* SMART INSIGHTS — alerts kontekstual real-time (auto-hide bila aman) */}
      {insights.length > 0 && (
        <section className="rounded-2xl border border-black/[0.06] dark:border-white/[0.07] bg-white/95 dark:bg-[#0B1220]/95 p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-stone-400 dark:text-zinc-500 font-semibold">Tindakan cepat</p>
              <h2 className="mt-2 text-sm font-semibold text-stone-900 dark:text-zinc-100">Smart Insights</h2>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-zinc-500">Hanya kondisi yang perlu tindak lanjut.</p>
          </div>
          <div className="mt-4">
            <SmartInsights items={insights} />
          </div>
        </section>
      )}

      {/* HERO — Modal Berputar + mini sparkline 14d */}
      <ModalHero
        total={metrics.totalModalBerputar}
        breakdown={modalBreakdown}
        trend={charts.trend}
      />

      {/* TODAY STRIP — kompak horizontal, bukan card besar */}
      <TodayStrip items={todayItems} />

      {/* GLANCE — Net Margin + Harga Acuan */}
      <NetMarginAndHarga
        netMarginPct={metrics.netMarginPct}
        estimasiLaba={metrics.estimasiLaba}
        totalPembelian={metrics.totalPembelian}
        totalRevenue={metrics.totalRevenue}
        hargaLatest={hargaLatest}
      />

      {/* TWO-UP — Saldo akun + Pajak compact */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Saldo (lg:col-span-2) */}
        <div className="lg:col-span-2 surface overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-100 dark:border-border flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-[#6B7280]">Saldo Rekening &amp; Kas</p>
            <p className="text-xs font-semibold num tabular-nums text-stone-900 dark:text-stone-100">{formatRupiah(metrics.totalSaldo)}</p>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-border">
            {akunCvOcm && (
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-900 dark:bg-white shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{akunCvOcm.nama}</p>
                    <p className="text-[10px] text-stone-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">Utama</p>
                  </div>
                </div>
                <p className={`text-sm font-bold num tabular-nums shrink-0 ${akunCvOcm.saldo >= 0 ? 'text-stone-900 dark:text-stone-100' : 'text-red-500'}`}>
                  {formatRupiah(akunCvOcm.saldo)}
                </p>
              </div>
            )}
            {akunLainnya.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-2.5">
                <p className="text-sm text-stone-600 dark:text-stone-300 truncate mr-3">{a.nama}</p>
                <p className={`text-sm font-semibold num tabular-nums shrink-0 ${a.saldo >= 0 ? 'text-stone-800 dark:text-stone-200' : 'text-red-500'}`}>
                  {formatRupiah(a.saldo)}
                </p>
              </div>
            ))}
            {akunTunai.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm text-stone-600 dark:text-stone-300 truncate">{a.nama}</p>
                  <span className="text-[10px] text-stone-400 dark:text-zinc-500 uppercase tracking-wider shrink-0">Tunai</span>
                </div>
                <p className={`text-sm font-semibold num tabular-nums shrink-0 ${a.saldo >= 0 ? 'text-stone-800 dark:text-stone-200' : 'text-red-500'}`}>
                  {formatRupiah(a.saldo)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pajak strip — ultra compact */}
        <TaxStrip tax={tax} />
      </div>

      {/* CHART — cashflow harian (single, fokus) */}
      <div className="surface overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-100 dark:border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 tracking-tight">Cashflow Harian</p>
            <p className="text-[11px] text-stone-400 dark:text-zinc-500 mt-0.5">Kas masuk vs keluar — 14 hari terakhir</p>
          </div>
        </div>
        <div className="p-4">
          <CashflowChart data={charts.daily} />
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   Modal Hero — full-width, subtle gradient, breakdown inline.
   ────────────────────────────────────────────────────────────── */

function ModalHero({
  total,
  breakdown,
  trend,
}: {
  total: number
  breakdown: { label: string; value: string }[]
  trend: { date: string; total: number }[]
}) {
  // Hitung pct change 14d ke nilai sekarang
  const first = trend[0]?.total ?? total
  const pctChange = first > 0 ? ((total - first) / first) * 100 : 0
  const up = pctChange >= 0

  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-[#0F0F0F] p-5 sm:p-6">
      {/* Subtle radial accent — dark plum/indigo, sangat halus */}
      <div
        aria-hidden
        className="absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-[0.10] dark:opacity-[0.18] blur-3xl"
        style={{ background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full opacity-[0.06] dark:opacity-[0.10] blur-3xl"
        style={{ background: 'radial-gradient(circle, #10B981 0%, transparent 70%)' }}
      />

      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">Total Modal Berputar</p>
          <p className="mt-3 text-[2.25rem] sm:text-[2.75rem] leading-none font-bold num tabular-nums tracking-[-0.035em] text-stone-900 dark:text-zinc-50">
            {formatRupiah(total)}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5">
            <span className={`inline-flex items-center text-[11px] font-semibold num tabular-nums ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
              {up ? '▲' : '▼'} {Math.abs(pctChange).toFixed(2)}%
            </span>
            <span className="text-[11px] text-stone-400 dark:text-zinc-500">vs 14 hari lalu</span>
          </div>
        </div>

        {/* Mini sparkline 14d */}
        <Sparkline data={trend.map((t) => t.total)} up={up} />
      </div>

      {/* Inline breakdown — chip style, bukan grid card */}
      <div className="relative mt-5 flex flex-wrap gap-x-5 gap-y-2 pt-4 border-t border-stone-100 dark:border-white/[0.06]">
        {breakdown.map((b, i) => (
          <div key={b.label} className="flex items-center gap-2">
            {i > 0 && <span className="hidden sm:inline h-3 w-px bg-stone-200 dark:bg-white/10" />}
            <span className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">{b.label}</span>
            <span className="text-[13px] font-semibold num tabular-nums text-stone-800 dark:text-zinc-200">{b.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* SVG sparkline — pure inline, tanpa dependency tambahan. */
function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  if (data.length < 2) return null
  const w = 120
  const h = 44
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)

  const points = data.map((v, i) => {
    const x = i * step
    const y = h - ((v - min) / range) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const path = `M ${points.join(' L ')}`
  const areaPath = `${path} L ${w},${h} L 0,${h} Z`
  const stroke = up ? '#10B981' : '#F43F5E'
  const id = `sl-grad-${up ? 'up' : 'dn'}`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className="w-[120px] h-[44px] shrink-0"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={(data.length - 1) * step}
        cy={h - ((data[data.length - 1] - min) / range) * h}
        r={2.5}
        fill={stroke}
      />
    </svg>
  )
}

/* Today strip — horizontal chip row, monokrom dengan accent kanan saja. */
function TodayStrip({
  items,
}: {
  items: { label: string; value: string; icon: React.ElementType; color: string }[]
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-stone-50/60 dark:bg-white/[0.025] px-3 py-3 sm:px-4 sm:py-3.5 min-w-0"
        >
          <div className="flex items-center gap-1.5">
            <item.icon className="h-3 w-3 text-stone-400 dark:text-zinc-500" strokeWidth={2} />
            <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium truncate">{item.label.replace(' Hari Ini', '')}</p>
          </div>
          <p className="mt-1.5 text-[15px] sm:text-base font-bold num tabular-nums text-stone-900 dark:text-zinc-100 truncate">{item.value}</p>
        </div>
      ))}
    </div>
  )
}

/* Pajak — compact column dengan dot status */
function TaxStrip({ tax }: { tax: any }) {
  const items = [
    {
      label: 'PPN Bulan Ini',
      value: formatRupiah(tax.ppnThisMonth),
      sub: 'Estimasi penjualan lunas',
      status: 'info' as const,
    },
    {
      label: 'PPN Bulan Lalu',
      value: tax.ppnLastMonth?.statusSetor === 'sudah' ? 'Sudah Disetor' : 'Belum Disetor',
      sub: tax.ppnLastMonth?.statusSetor === 'sudah' ? `Tgl ${tax.ppnLastMonth.tanggalSetor ?? '-'}` : 'JT akhir bulan ini',
      status: (tax.ppnLastMonth?.statusSetor === 'sudah' ? 'done' : 'pending') as 'done' | 'pending',
    },
    {
      label: 'PPh Pasal 25',
      value: tax.pphLastMonth?.statusBayar === 'sudah' ? 'Sudah Dibayar' : 'Belum Dibayar',
      sub: tax.pphLastMonth?.statusBayar === 'sudah' ? `Tgl ${tax.pphLastMonth.tanggalBayar ?? '-'}` : 'JT tgl 15',
      status: (tax.pphLastMonth?.statusBayar === 'sudah' ? 'done' : 'pending') as 'done' | 'pending',
    },
  ]

  return (
    <div className="surface overflow-hidden">
      <div className="px-5 py-3 border-b border-stone-100 dark:border-border flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-[#6B7280]">Pajak</p>
        <p className="text-[10px] text-stone-400 dark:text-zinc-500">PPN 11% · PPh 25</p>
      </div>
      <div className="divide-y divide-stone-100 dark:divide-border">
        {items.map((it) => {
          const dotColor = it.status === 'done'
            ? 'bg-[#60A5FA]'
            : it.status === 'pending'
              ? 'bg-[#F87171]'
              : 'bg-stone-300 dark:bg-zinc-600'
          return (
            <div key={it.label} className="px-5 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] text-stone-400 dark:text-zinc-500 font-medium">{it.label}</p>
                <p className="text-[10px] text-stone-400 dark:text-zinc-600 mt-0.5">{it.sub}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                <p className="text-[12px] font-semibold num tabular-nums text-stone-800 dark:text-zinc-200">{it.value}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   Net Margin Glance + Harga Acuan Reference
   Two-up premium glance bar — owner langsung lihat profitabilitas
   dan harga lapangan terbaru tanpa pindah halaman.
   ────────────────────────────────────────────────────────────── */

type HargaLatest = {
  produk: string
  current: { hargaLapangan: number; selisihJualBga: number; tanggalBerlaku: string } | null
  previous: { hargaLapangan: number } | null
  delta: number
}

function NetMarginAndHarga({
  netMarginPct,
  estimasiLaba,
  totalPembelian,
  totalRevenue,
  hargaLatest,
}: {
  netMarginPct: number
  estimasiLaba: number
  totalPembelian: number
  totalRevenue: number
  hargaLatest: HargaLatest[]
}) {
  // Klasifikasi warna margin — health visual
  const healthy = netMarginPct >= 1.5
  const moderate = netMarginPct >= 0.5 && netMarginPct < 1.5
  const marginTone = healthy
    ? 'text-emerald-500 dark:text-emerald-400'
    : moderate
      ? 'text-amber-500 dark:text-amber-400'
      : 'text-stone-500 dark:text-zinc-400'
  const marginBar = healthy
    ? 'bg-emerald-500/80'
    : moderate
      ? 'bg-amber-500/80'
      : 'bg-stone-400/60'

  // Skala bar — 3% margin = 100% bar (TBS trading umumnya tipis)
  const barWidth = Math.max(4, Math.min(100, (netMarginPct / 3) * 100))

  return (
    <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
      {/* Net Margin Glance */}
      <div className="surface press-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-stone-400 dark:text-zinc-500" strokeWidth={2} />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-[#6B7280]">Net Margin</p>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className={`text-[2.25rem] sm:text-[2.6rem] leading-none font-bold num tabular-nums tracking-[-0.03em] ${marginTone}`}>
                {netMarginPct.toFixed(2)}
              </span>
              <span className={`text-base font-semibold ${marginTone}`}>%</span>
            </div>
            <p className="mt-1.5 text-[11px] text-stone-400 dark:text-zinc-500">
              {formatRupiah(estimasiLaba)} dari {formatRupiah(totalPembelian)} pembelian
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">Revenue</p>
            <p className="mt-1 text-[13px] font-semibold text-stone-700 dark:text-zinc-300 num tabular-nums">
              {formatRupiah(totalRevenue)}
            </p>
          </div>
        </div>
        {/* Margin health bar */}
        <div className="mt-5 h-1.5 w-full rounded-full bg-stone-100 dark:bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${marginBar}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400 dark:text-zinc-500 font-medium tabular-nums">
          <span>0%</span>
          <span>1.5%</span>
          <span>3%+</span>
        </div>
      </div>

      {/* Harga Acuan Reference */}
      <div className="surface press-card overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100 dark:border-border flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-[#6B7280]">Harga Lapangan</p>
          <a
            href="/harga"
            className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white font-medium transition-colors"
          >
            Kelola →
          </a>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-border">
          {hargaLatest.map(({ produk, current, delta }) => {
            const up = delta > 0
            const down = delta < 0
            const DeltaIcon = up ? ArrowUpRight : down ? ArrowDownRight : null
            const deltaTone = up
              ? 'text-emerald-500 dark:text-emerald-400'
              : down
                ? 'text-rose-500 dark:text-rose-400'
                : 'text-stone-400 dark:text-zinc-500'
            return (
              <div key={produk} className="flex items-center justify-between px-5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[12px] font-mono font-semibold text-stone-700 dark:text-zinc-200 truncate">{produk}</p>
                  {current && (
                    <p className="text-[10px] text-stone-400 dark:text-zinc-500 mt-0.5">{formatTanggal(current.tanggalBerlaku)}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {current ? (
                    <>
                      <p className="text-[14px] font-bold num tabular-nums text-stone-900 dark:text-zinc-50 leading-none">
                        Rp {current.hargaLapangan.toLocaleString('id-ID')}
                      </p>
                      {delta !== 0 && DeltaIcon && (
                        <p className={`inline-flex items-center gap-0.5 mt-1 text-[10px] font-semibold num tabular-nums ${deltaTone}`}>
                          <DeltaIcon className="h-3 w-3" strokeWidth={2.5} />
                          {Math.abs(delta).toLocaleString('id-ID')}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] text-stone-400 dark:text-zinc-600">—</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   Smart Insights — strip alerts kontekstual (max 3 chip).
   Tampilkan hanya bila ada kondisi actionable. Aman = sembunyi total.
   ────────────────────────────────────────────────────────────── */

function SmartInsights({ items }: { items: Insight[] }) {
  const iconMap = {
    piutang: Clock,
    harga: CircleDollarSign,
    pajak: AlertCircle,
    margin: TrendingUp,
  }
  const toneMap = {
    warn: {
      bg: 'bg-amber-500/[0.10] dark:bg-amber-500/[0.08]',
      border: 'border-amber-500/20',
      icon: 'text-amber-600 dark:text-amber-400',
      dot: 'bg-amber-500',
    },
    info: {
      bg: 'bg-blue-500/[0.10] dark:bg-blue-500/[0.08]',
      border: 'border-blue-500/15',
      icon: 'text-blue-600 dark:text-blue-400',
      dot: 'bg-blue-500',
    },
    good: {
      bg: 'bg-emerald-500/[0.10] dark:bg-emerald-500/[0.08]',
      border: 'border-emerald-500/15',
      icon: 'text-emerald-600 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    },
  } as const

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {items.map((it) => {
        const Icon = iconMap[it.icon]
        const tone = toneMap[it.tone]
        const Wrapper: any = it.href ? 'a' : 'div'
        return (
          <Wrapper
            key={it.id}
            href={it.href}
            className={`group flex min-w-0 items-center gap-3 rounded-2xl border ${tone.border} ${tone.bg} px-3.5 py-3 transition duration-200 ease-out ${it.href ? 'hover:-translate-y-0.5 cursor-pointer hover:bg-white/90 dark:hover:bg-slate-950/90' : ''}`}
          >
            <div className={`relative flex h-8 w-8 items-center justify-center rounded-xl ${tone.bg} shrink-0`}>
              <Icon className={`h-4 w-4 ${tone.icon}`} strokeWidth={2.25} />
              <span className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-stone-900 dark:text-zinc-100 truncate leading-tight">{it.label}</p>
              {it.detail && (
                <p className="text-[11px] text-stone-500 dark:text-zinc-400 tabular-nums truncate mt-0.5">{it.detail}</p>
              )}
            </div>
            {it.href && (
              <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 dark:text-zinc-500 group-hover:text-stone-700 dark:group-hover:text-zinc-300 transition-colors shrink-0">
                →
              </span>
            )}
          </Wrapper>
        )
      })}
    </div>
  )
}
