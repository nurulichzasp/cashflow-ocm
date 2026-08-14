'use client'

import { useState, useEffect, useMemo, useCallback, useRef, useTransition } from 'react'
import { getLaporanData, getPembelianBulanan, getPajakData, getLabaRugiTahunan, getNeracaData } from './actions'
import { formatRupiah, formatNumber, formatTanggal, todayString } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArahIndicator, StatusDotLabel } from '@/components/ui/status-pill'
import { DateRangeInline } from '@/components/date-range-inline'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, FileSpreadsheet } from 'lucide-react'
import { updatePpnStatus, updatePphStatus } from '../pengaturan/actions'
import { cn } from '@/lib/utils'
import type { TransaksiKas, AkunKas } from '@/lib/db/schema'

type LaporanData = Awaited<ReturnType<typeof getLaporanData>>
type TabKey = 'laba-rugi' | 'per-peron' | 'pembelian-bulanan' | 'buku-kas' | 'mutasi-bank' | 'pajak' | 'tahunan' | 'neraca'
type KasRow = TransaksiKas & { akun: AkunKas | null }

function useAsyncReportData<T>(key: string, fetchData: (key: string) => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const retry = useCallback(async () => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setError(false)
    try {
      const next = await fetchData(key)
      if (currentRequest === requestId.current) setData(next)
    } catch {
      if (currentRequest === requestId.current) setError(true)
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [fetchData, key])

  useEffect(() => {
    // Jalankan setelah commit agar effect tidak membuat render berantai. Nomor
    // request memastikan respons periode lama tidak dapat menimpa periode baru.
    const frame = requestAnimationFrame(() => { void retry() })
    return () => {
      cancelAnimationFrame(frame)
      requestId.current += 1
    }
  }, [retry])

  return { data, loading, error, retry }
}

const kategoriLabels: Record<TransaksiKas['kategori'], string> = {
  penerimaan_bga: 'Penerimaan BGA',
  tarik_bri: 'Tarik / Transfer',
  bayar_peron: 'Bayar Peron',
  modal_peron: 'Modal Peron',
  kembali_modal: 'Kembali Modal',
  biaya_operasional: 'Biaya Operasional',
  penyesuaian: 'Penyesuaian',
  lainnya: 'Lainnya',
}

/**
 * Skeleton ringkas untuk tab async (Pajak / L/R Tahunan / Neraca) saat memuat —
 * baris tabel berdenyut, selaras gaya skeleton app (animate-pulse + abu redup).
 */
function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden="true">
      <div className="h-4 w-40 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/50 px-4 py-2.5">
          <div className="h-3 w-24 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="h-3.5 w-32 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
              <div className="h-3.5 w-20 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** UI retry inline saat fetch tab gagal — pesan singkat + tombol coba lagi. */
function RetryState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-dashed py-10 px-4 text-center space-y-3">
      <p className="text-sm text-muted-foreground">
        Gagal memuat. Periksa koneksi lalu coba lagi.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Coba Lagi
      </Button>
    </div>
  )
}

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [
    keys.join(','),
    ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(',')),
  ].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

async function exportXLSX(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan')
  XLSX.writeFile(wb, filename)
}

function ExportButtons({ onCSV, onXLSX }: { onCSV: () => void; onXLSX: () => void }) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={onCSV}>
        <Download className="h-4 w-4 mr-1.5" />CSV
      </Button>
      <Button variant="outline" size="sm" onClick={onXLSX}>
        <FileSpreadsheet className="h-4 w-4 mr-1.5" />Excel
      </Button>
    </div>
  )
}

function LabaRugiTab({ data, dari, sampai }: { data: LaporanData; dari: string; sampai: string }) {
  const { totalPenjualan, totalPembelian, totalBiaya, labaBersih, totalKeuntungan, marginBersih, marginBersihPerKg, breakEvenVolumeKg, totalTonase } = data.labaRugi
  const labaKotor = totalPenjualan - totalPembelian

  const exportRows = [
    { Keterangan: 'Pendapatan Penjualan (akrual)', 'Jumlah (Rp)': totalPenjualan },
    { Keterangan: 'HPP – Pembelian (akrual)', 'Jumlah (Rp)': totalPembelian },
    { Keterangan: 'Laba Kotor', 'Jumlah (Rp)': labaKotor },
    { Keterangan: 'Biaya Operasional', 'Jumlah (Rp)': totalBiaya },
    { Keterangan: 'Laba Bersih', 'Jumlah (Rp)': labaBersih },
    { Keterangan: 'Margin Dagang (markup peron, sblm biaya)', 'Jumlah (Rp)': totalKeuntungan },
    { Keterangan: 'Margin Bersih OCM (stlh biaya)', 'Jumlah (Rp)': marginBersih },
    { Keterangan: 'Margin Bersih per kg (Rp/kg)', 'Jumlah (Rp)': marginBersihPerKg },
    { Keterangan: 'Break-even Volume (kg)', 'Jumlah (Rp)': breakEvenVolumeKg },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Laporan Laba Rugi</h3>
        <ExportButtons
          onCSV={() => exportCSV(exportRows, `laba-rugi-${dari}-${sampai}.csv`)}
          onXLSX={() => exportXLSX(exportRows, `laba-rugi-${dari}-${sampai}.xlsx`)}
        />
      </div>
      <div className="rounded-lg border overflow-x-auto max-w-md md:max-w-xl">
        <table className="w-full text-sm">
          <tbody>
            {[
              { label: 'Pendapatan Penjualan (akrual)', value: totalPenjualan, cls: 'text-foreground' },
              { label: 'HPP – Pembelian (akrual)', value: totalPembelian, cls: 'text-muted-foreground' },
              { label: 'Laba Kotor', value: labaKotor, cls: 'font-semibold text-foreground', bg: 'bg-muted/30', sep: true },
              { label: 'Biaya Operasional', value: totalBiaya, cls: 'text-muted-foreground' },
              { label: 'Laba Bersih', value: labaBersih, cls: 'font-semibold text-foreground', bg: 'bg-muted/30', sep: true, valueCls: labaBersih > 0 ? 'text-ok' : labaBersih < 0 ? 'text-crit' : '' },
              { label: 'Margin Dagang (markup peron, sblm biaya)', value: totalKeuntungan, cls: 'text-foreground font-semibold' },
              { label: 'Margin Bersih OCM (stlh biaya)', value: marginBersih, cls: 'font-semibold text-foreground', bg: 'bg-muted/30', sep: true, valueCls: marginBersih > 0 ? 'text-ok' : marginBersih < 0 ? 'text-crit' : '' },
            ].map((row, i) => (
              <tr key={i} className={cn('border-b last:border-0', row.sep ? 'border-t-2 border-t-border' : '', row.bg ?? '')}>
                <td className={cn('px-4 py-3', row.cls)}>{row.label}</td>
                {/* Aksen emerald hanya pada ANGKA hasil akhir (Laba Bersih), bukan label. */}
                <td className={cn('px-4 py-3 text-right tabular-nums', row.cls, row.valueCls)}>{formatRupiah(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Metrik keputusan: margin BERSIH per kg & break-even volume (satuan kg, bukan Rp total). */}
      <p className="px-1 text-xs text-muted-foreground leading-relaxed max-w-md md:max-w-xl">
        Margin bersih ≈ <span className="tabular-nums font-medium text-foreground">{formatRupiah(marginBersihPerKg)}/kg</span>
        {' · '}Break-even ≈ <span className="tabular-nums font-medium text-foreground">{formatNumber(breakEvenVolumeKg)} kg</span>
        {' '}(dari {formatNumber(Math.round(totalTonase))} kg ditangani). Markup peron belum dikurangi biaya OCM; margin bersih sudah.
      </p>
    </div>
  )
}

function PerPeronTab({ data, dari, sampai }: { data: LaporanData; dari: string; sampai: string }) {
  const exportRows = data.laporanPeron.map((p) => ({
    Peron: p.nama,
    'Jumlah Tiket': p.jumlahTiket,
    'Tonase (kg)': p.tonase,
    'Total Beli (Rp)': p.totalBeli,
    'Keuntungan (Rp)': p.keuntungan,
    'Realisasi/kg (Rp)': p.tonase === 0 ? null : p.realizedPerKg, // null = sel kosong, selaras "—" di UI
    'Target/kg (Rp)': p.targetPerKg,
    'DP Aktif (Rp)': p.dpAktif,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Laporan Per Peron</h3>
        {data.laporanPeron.length > 0 && (
          <ExportButtons
            onCSV={() => exportCSV(exportRows, `laporan-per-peron-${dari}-${sampai}.csv`)}
            onXLSX={() => exportXLSX(exportRows, `laporan-per-peron-${dari}-${sampai}.xlsx`)}
          />
        )}
      </div>
      {data.laporanPeron.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Tidak ada data pembelian pada periode ini.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Peron</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tiket</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tonase (kg)</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Total Beli</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Keuntungan</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Realisasi/kg</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Target/kg</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">DP Aktif</th>
              </tr>
            </thead>
            <tbody>
              {data.laporanPeron.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className="px-4 py-3 font-medium">{p.nama}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.jumlahTiket}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatNumber(p.tonase)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(p.totalBeli)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatRupiah(p.keuntungan)}</td>
                  {/* Realisasi/kg dibandingkan target peron: capai/lewati target = ok, di bawah = warn. */}
                  <td className={cn('px-4 py-3 text-right tabular-nums', p.tonase === 0 ? 'text-muted-foreground' : p.realizedPerKg >= p.targetPerKg ? 'text-ok' : 'text-warn')}>{p.tonase === 0 ? '—' : formatRupiah(p.realizedPerKg)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatRupiah(p.targetPerKg)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(p.dpAktif)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function KasTab({
  title, transaksi, saldoAwal, csvFilename, xlsxFilename,
}: {
  title: string
  transaksi: KasRow[]
  saldoAwal: number
  csvFilename: string
  xlsxFilename: string
}) {
  const { rowsWithBalance, saldoAkhir } = useMemo(
    () => transaksi.reduce<{
      rowsWithBalance: Array<KasRow & { saldo: number }>
      saldoAkhir: number
    }>((state, transaksiKas) => {
      const saldo = state.saldoAkhir + (transaksiKas.arah === 'masuk' ? transaksiKas.jumlah : -transaksiKas.jumlah)
      return {
        rowsWithBalance: [...state.rowsWithBalance, { ...transaksiKas, saldo }],
        saldoAkhir: saldo,
      }
    }, { rowsWithBalance: [], saldoAkhir: saldoAwal }),
    [transaksi, saldoAwal],
  )

  const exportRows = rowsWithBalance.map((t) => ({
    Tanggal: t.tanggal,
    Akun: t.akun?.nama ?? t.akunId,
    Kategori: kategoriLabels[t.kategori],
    Arah: t.arah === 'masuk' ? 'Masuk' : 'Keluar',
    'Jumlah (Rp)': t.jumlah,
    'Saldo (Rp)': t.saldo,
    Catatan: t.catatan ?? '',
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        {transaksi.length > 0 && (
          <ExportButtons
            onCSV={() => exportCSV(exportRows, csvFilename)}
            onXLSX={() => exportXLSX(exportRows, xlsxFilename)}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Saldo Awal Periode</p>
            <p className="text-lg font-semibold">{formatRupiah(saldoAwal)}</p>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Saldo Akhir Periode</p>
            <p className={cn('text-lg font-semibold', saldoAkhir < 0 && 'text-crit')}>
              {formatRupiah(saldoAkhir)}
            </p>
          </CardContent>
        </Card>
      </div>
      {transaksi.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Tidak ada transaksi pada periode ini.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Akun</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Kategori</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Arah</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Jumlah</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Saldo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {rowsWithBalance.map((t, i) => (
                <tr key={t.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className="px-4 py-3 whitespace-nowrap">{formatTanggal(t.tanggal)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.akun?.nama ?? t.akunId}</td>
                  <td className="px-4 py-3">{kategoriLabels[t.kategori]}</td>
                  <td className="px-4 py-3">
                    {/* Arah = indikator panah minimalis (sebahasa dot Lunas). */}
                    <ArahIndicator arah={t.arah} />
                  </td>
                  <td className={cn('px-4 py-3 text-right tabular-nums font-semibold', t.arah === 'masuk' ? 'text-stone-900 dark:text-zinc-50' : 'text-stone-500 dark:text-zinc-400')}>
                    {t.arah === 'masuk' ? '+' : '-'}{formatRupiah(t.jumlah)}
                  </td>
                  {/* Saldo berjalan negatif → merah teredam (anomali kebaca). */}
                  <td className={cn('px-4 py-3 text-right tabular-nums font-medium', t.saldo < 0 && 'text-crit')}>{formatRupiah(t.saldo)}</td>
                  {/* Truncate catatan: tanpa ini, catatan panjang membungkus → baris tinggi
                      tak rata (gap besar antar entri Mutasi Bank). Samakan dgn tabel lain. */}
                  <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate">{t.catatan ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']

type PajakData = Awaited<ReturnType<typeof getPajakData>>

// Tarif pecahan (0.11) → label persen ("11%"); label pajak ikut tarif tersimpan
// di pengaturan, bukan hardcode.
function formatPersenTarif(t: number): string {
  return `${(t * 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`
}
type LabaRugiTahunanData = Awaited<ReturnType<typeof getLabaRugiTahunan>>
type NeracaDataType = Awaited<ReturnType<typeof getNeracaData>>
type PembelianBulananData = Awaited<ReturnType<typeof getPembelianBulanan>>

/**
 * Tab Pembelian Bulanan — rekap operasional satu bulan: total tonase & nilai
 * pembelian, dipecah per peron dan per kategori. Fetch mandiri saat bulan ganti
 * (pola sama seperti PajakTab). Pemilih bulan pakai <input type="month"> native.
 */
function PembelianBulananTab({ bulan, onBulanChange }: { bulan: string; onBulanChange: (b: string) => void }) {
  const { data, loading, error, retry } = useAsyncReportData<PembelianBulananData>(bulan, getPembelianBulanan)

  const [th, tm] = bulan.split('-')
  const labelBulan = `${MONTHS_SHORT[parseInt(tm, 10) - 1] ?? tm} ${th}`

  const bulanPicker = (
    <input
      type="month"
      value={bulan}
      max={todayString().slice(0, 7)}
      onChange={(e) => e.target.value && onBulanChange(e.target.value)}
      aria-label="Pilih bulan"
      className="h-9 rounded-md border bg-background px-3 text-sm tabular-nums"
    />
  )

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">{bulanPicker}</div>
        <RetryState onRetry={() => { void retry() }} />
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">{bulanPicker}</div>
        <TableSkeleton rows={6} />
      </div>
    )
  }

  const kosong = data.total.jumlahTiket === 0

  const exportRows = data.perPeron.map((p) => ({
    Peron: p.nama,
    'Jumlah Tiket': p.jumlahTiket,
    'Tonase (kg)': p.tonase,
    'Total Beli (Rp)': p.totalBeli,
    'Keuntungan (Rp)': p.keuntungan,
    'Realisasi/kg (Rp)': p.tonase === 0 ? null : p.realizedPerKg, // null = sel kosong, selaras "—" di UI
    'Target/kg (Rp)': p.targetPerKg,
  }))

  const ringkas = [
    { label: 'Total Tonase', value: `${formatNumber(Math.round(data.total.tonase))} kg` },
    { label: 'Total Beli', value: formatRupiah(data.total.totalBeli) },
    { label: 'Estimasi Untung', value: formatRupiah(data.total.keuntungan) },
    { label: 'Jumlah Tiket', value: formatNumber(data.total.jumlahTiket) },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {bulanPicker}
          <span className="text-sm text-muted-foreground">Pembelian {labelBulan}</span>
        </div>
        {!kosong && (
          <ExportButtons
            onCSV={() => exportCSV(exportRows, `pembelian-${bulan}.csv`)}
            onXLSX={() => exportXLSX(exportRows, `pembelian-${bulan}.xlsx`)}
          />
        )}
      </div>

      {kosong ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Tidak ada pembelian pada {labelBulan}.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {ringkas.map((r) => (
              <Card key={r.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">{r.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold tabular-nums text-stone-900 dark:text-zinc-50">{r.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">Per Peron</h3>
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Peron</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tiket</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tonase (kg)</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Total Beli</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Keuntungan</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Realisasi/kg</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Target/kg</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perPeron.map((p, i) => (
                    <tr key={p.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="px-4 py-3 font-medium">{p.nama}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{p.jumlahTiket}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatNumber(p.tonase)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(p.totalBeli)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatRupiah(p.keuntungan)}</td>
                      <td className={cn('px-4 py-3 text-right tabular-nums', p.tonase === 0 ? 'text-muted-foreground' : p.realizedPerKg >= p.targetPerKg ? 'text-ok' : 'text-warn')}>{p.tonase === 0 ? '—' : formatRupiah(p.realizedPerKg)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatRupiah(p.targetPerKg)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-t-border bg-muted/30 font-semibold">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums">{data.total.jumlahTiket}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(Math.round(data.total.tonase))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(data.total.totalBeli)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(data.total.keuntungan)}</td>
                    <td className="px-4 py-3" colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">Per Kategori</h3>
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Kategori</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tiket</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tonase (kg)</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Total Beli</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Keuntungan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perKategori.map((k, i) => (
                    <tr key={k.kategori} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="px-4 py-3 font-medium">{k.kategori}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{k.jumlahTiket}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatNumber(k.tonase)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(k.totalBeli)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatRupiah(k.keuntungan)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PajakTab({ tahun, onTahunChange }: { tahun: string; onTahunChange: (t: string) => void }) {
  const { data, loading, error, retry } = useAsyncReportData<PajakData>(tahun, getPajakData)

  if (error) return <RetryState onRetry={() => { void retry() }} />
  if (loading || !data) return <TableSkeleton rows={6} />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Select value={tahun} onValueChange={onTahunChange}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[0, 1, 2].map(i => {
              const y = String(new Date().getFullYear() - i)
              return <SelectItem key={y} value={y}>{y}</SelectItem>
            })}
          </SelectContent>
        </Select>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">PPN Bulanan ({formatPersenTarif(data.tarifPpn)})</h3>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Bulan</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Penjualan</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">PPN</th>
                <th className="text-center px-4 py-2 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.ppnPerBulan).map(([bulan, d]) => (
                <tr key={bulan} className="border-t">
                  <td className="px-4 py-2">{MONTHS_SHORT[parseInt(bulan.split('-')[1]) - 1]} {bulan.split('-')[0]}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatRupiah(d.totalPenjualan)}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold">{formatRupiah(d.ppn)}</td>
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      aria-label={`Ubah status setor PPN bulan ${bulan} — sekarang ${d.status === 'sudah' ? 'sudah disetor' : 'belum'}`}
                      className="tap-pad inline-flex cursor-pointer transition-opacity hover:opacity-70"
                      onClick={async () => {
                        const next = d.status === 'sudah' ? 'belum' : 'sudah'
                        const tgl = next === 'sudah' ? todayString() : undefined
                        await updatePpnStatus(bulan, next, tgl)
                        await retry()
                      }}
                    >
                      <StatusDotLabel tone={d.status === 'sudah' ? 'ok' : 'warn'} label={d.status === 'sudah' ? 'Sudah Disetor' : 'Belum'} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">PPh Pasal 25 Bulanan</h3>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Bulan</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Nominal</th>
                <th className="text-center px-4 py-2 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.pphPerBulan).map(([bulan, d]) => (
                <tr key={bulan} className="border-t">
                  <td className="px-4 py-2">{MONTHS_SHORT[parseInt(bulan.split('-')[1]) - 1]} {bulan.split('-')[0]}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatRupiah(d.nominal)}</td>
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      aria-label={`Ubah status bayar PPh bulan ${bulan} — sekarang ${d.status === 'sudah' ? 'sudah dibayar' : 'belum'}`}
                      className="tap-pad inline-flex cursor-pointer transition-opacity hover:opacity-70"
                      onClick={async () => {
                        const next = d.status === 'sudah' ? 'belum' : 'sudah'
                        const tgl = next === 'sudah' ? todayString() : undefined
                        await updatePphStatus(bulan, next, tgl)
                        await retry()
                      }}
                    >
                      <StatusDotLabel tone={d.status === 'sudah' ? 'ok' : 'warn'} label={d.status === 'sudah' ? 'Sudah Dibayar' : 'Belum'} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function LabaRugiTahunanTab({ tahun, onTahunChange }: { tahun: string; onTahunChange: (t: string) => void }) {
  const { data, loading, error, retry } = useAsyncReportData<LabaRugiTahunanData>(tahun, getLabaRugiTahunan)

  if (error) return <RetryState onRetry={() => { void retry() }} />
  if (loading || !data) return <TableSkeleton rows={8} />

  const rows = [
    { label: 'Pendapatan Penjualan', value: data.totalPenjualan, cls: 'text-foreground' },
    { label: 'HPP / Pembelian', value: data.totalPembelian, cls: 'text-muted-foreground' },
    { label: 'Laba Kotor', value: data.labaKotor, cls: 'font-semibold', sep: true },
    { label: 'Biaya Operasional', value: data.totalBiaya, cls: 'text-muted-foreground' },
    { label: 'Laba Operasional (sebelum pajak)', value: data.labaOperasional, cls: 'font-semibold', sep: true },
    { label: `PPh Badan (${formatPersenTarif(data.tarifPphBadan)})`, value: data.pphBadan, cls: 'text-muted-foreground' },
    { label: 'Laba Bersih Setelah Pajak', value: data.labaBersih, cls: 'font-bold text-lg', sep: true, valueCls: data.labaBersih > 0 ? 'text-ok' : data.labaBersih < 0 ? 'text-crit' : '' },
    { label: 'Total PPh Pasal 25 Dibayar', value: data.totalPph25Dibayar, cls: 'text-muted-foreground' },
    { label: data.pphKurangBayar >= 0 ? 'PPh Kurang Bayar' : 'PPh Lebih Bayar', value: Math.abs(data.pphKurangBayar), cls: 'font-semibold text-foreground' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold">Laba Rugi Tahunan</h3>
        <Select value={tahun} onValueChange={onTahunChange}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[0, 1, 2].map(i => {
              const y = String(new Date().getFullYear() - i)
              return <SelectItem key={y} value={y}>{y}</SelectItem>
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border overflow-x-auto max-w-lg md:max-w-xl">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={cn('border-b last:border-0', row.sep ? 'border-t-2 border-t-border bg-muted/30' : '')}>
                <td className={cn('px-4 py-3', row.cls)}>{row.label}</td>
                {/* Aksen emerald hanya pada angka Laba Bersih Setelah Pajak (hasil akhir). */}
                <td className={cn('px-4 py-3 text-right tabular-nums', row.cls, row.valueCls)}>{formatRupiah(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NeracaTab() {
  const { data, loading, error, retry } = useAsyncReportData<NeracaDataType>('neraca', getNeracaData)

  if (error) return <RetryState onRetry={() => { void retry() }} />
  if (loading || !data) return <TableSkeleton rows={7} />

  const modalAwal = data.modalAwal
  const totalEkuitas = modalAwal + data.ekuitas.labaDitahan
  const totalKewajibanEkuitas = data.kewajiban.total + totalEkuitas
  const balanced = data.aset.total === totalKewajibanEkuitas
  const selisih = data.aset.total - totalKewajibanEkuitas

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Neraca (Balance Sheet)</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border overflow-x-auto">
          <div className="bg-muted/50 px-4 py-2 font-semibold text-sm">ASET</div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-t"><td className="px-4 py-2.5">Kas &amp; Bank</td><td className="px-4 py-2.5 text-right tabular-nums">{formatRupiah(data.aset.kasBank)}</td></tr>
              <tr className="border-t"><td className="px-4 py-2.5">Piutang BGA</td><td className="px-4 py-2.5 text-right tabular-nums">{formatRupiah(data.aset.piutangBga)}</td></tr>
              <tr className="border-t"><td className="px-4 py-2.5">DP/Modal Peron</td><td className="px-4 py-2.5 text-right tabular-nums">{formatRupiah(data.aset.dpPeron)}</td></tr>
              <tr className="border-t-2 border-t-border bg-muted/30"><td className="px-4 py-2.5 font-bold">Total Aset</td><td className="px-4 py-2.5 text-right tabular-nums font-bold">{formatRupiah(data.aset.total)}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <div className="bg-muted/50 px-4 py-2 font-semibold text-sm">KEWAJIBAN + EKUITAS</div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-t"><td className="px-4 py-2.5">Hutang PPN</td><td className="px-4 py-2.5 text-right tabular-nums">{formatRupiah(data.kewajiban.hutangPpn)}</td></tr>
              <tr className="border-t"><td className="px-4 py-2.5">Hutang PPh Psl 25</td><td className="px-4 py-2.5 text-right tabular-nums">{formatRupiah(data.kewajiban.hutangPph)}</td></tr>
              <tr className="border-t bg-muted/20"><td className="px-4 py-2.5 font-semibold">Total Kewajiban</td><td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatRupiah(data.kewajiban.total)}</td></tr>
              <tr className="border-t"><td className="px-4 py-2.5">Modal Awal</td><td className="px-4 py-2.5 text-right tabular-nums">{formatRupiah(modalAwal)}</td></tr>
              <tr className="border-t"><td className="px-4 py-2.5">Laba Ditahan</td><td className="px-4 py-2.5 text-right tabular-nums">{formatRupiah(data.ekuitas.labaDitahan)}</td></tr>
              <tr className="border-t bg-muted/20"><td className="px-4 py-2.5 font-semibold">Total Ekuitas</td><td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatRupiah(totalEkuitas)}</td></tr>
              <tr className="border-t-2 border-t-border bg-muted/30"><td className="px-4 py-2.5 font-bold">Total K + E</td><td className="px-4 py-2.5 text-right tabular-nums font-bold">{formatRupiah(totalKewajibanEkuitas)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={cn('rounded-lg px-4 py-3 text-sm font-semibold', balanced ? 'bg-muted text-muted-foreground border border-border' : 'pill-crit')}>
        {balanced
          ? 'Aset = Kewajiban + Ekuitas (Balance)'
          : `Selisih: ${formatRupiah(Math.abs(selisih))} — Aset ${selisih > 0 ? '>' : '<'} Kewajiban + Ekuitas`
        }
      </div>
    </div>
  )
}

export function LaporanClient({
  initialData, defaultDari, defaultSampai,
}: {
  initialData: LaporanData
  defaultDari: string
  defaultSampai: string
}) {
  const [data, setData] = useState(initialData)
  const [dari, setDari] = useState(defaultDari)
  const [sampai, setSampai] = useState(defaultSampai)
  const [activeTab, setActiveTab] = useState<TabKey>('laba-rugi')
  const [isPending, startTransition] = useTransition()

  function handleTerapkan() {
    startTransition(async () => {
      const result = await getLaporanData(dari, sampai)
      setData(result)
    })
  }

  const [taxTahun, setTaxTahun] = useState(String(new Date().getFullYear()))

  // Default tab pembelian bulanan ke BULAN LALU (yang sudah lewat & lengkap),
  // sesuai kebiasaan menutup buku begitu bulan berganti. Basis tanggal = WIB
  // (todayString) agar tak meleset di batas bulan/tengah malam.
  const [bulan, setBulan] = useState(() => {
    const [y, m] = todayString().split('-').map(Number)
    const prev = new Date(y, m - 2, 1) // m 1-based; m-2 = indeks bulan sebelumnya
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
  })

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'laba-rugi', label: 'Laba Rugi' },
    { key: 'per-peron', label: 'Per Peron' },
    { key: 'pembelian-bulanan', label: 'Pembelian Bulanan' },
    { key: 'buku-kas', label: 'Buku Kas' },
    { key: 'mutasi-bank', label: 'Mutasi Bank' },
    { key: 'pajak', label: 'Pajak' },
    { key: 'tahunan', label: 'L/R Tahunan' },
    { key: 'neraca', label: 'Neraca' },
  ]

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <DateRangeInline
              dari={dari}
              sampai={sampai}
              onChange={(d, s) => { setDari(d); setSampai(s) }}
              className="w-full sm:w-auto sm:min-w-[280px]"
            />
            <Button onClick={handleTerapkan} disabled={isPending}>
              {isPending ? 'Memuat...' : 'Terapkan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Penjualan (akrual)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-stone-900 dark:text-zinc-50">{formatRupiah(data.labaRugi.totalPenjualan)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Pembelian (akrual)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-stone-900 dark:text-zinc-50">{formatRupiah(data.labaRugi.totalPembelian)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Biaya Operasional</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-foreground">{formatRupiah(data.labaRugi.totalBiaya)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Estimasi Laba</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Hasil akhir → aksen emerald tipis (merah teredam bila rugi). */}
            <p className={`text-xl font-semibold ${data.labaRugi.totalKeuntungan > 0 ? 'text-ok' : data.labaRugi.totalKeuntungan < 0 ? 'text-crit' : 'text-stone-900 dark:text-stone-100'}`}>
              {formatRupiah(data.labaRugi.totalKeuntungan)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex border-b overflow-x-auto" role="tablist" aria-label="Bagian laporan">
          {tabs.map((t, i) => (
            <button
              key={t.key}
              id={`laporan-tab-${t.key}`}
              type="button"
              role="tab"
              aria-selected={activeTab === t.key}
              aria-controls="laporan-panel"
              tabIndex={activeTab === t.key ? 0 : -1}
              onClick={() => setActiveTab(t.key)}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
                e.preventDefault()
                const dir = e.key === 'ArrowRight' ? 1 : -1
                const next = tabs[(i + dir + tabs.length) % tabs.length]
                setActiveTab(next.key)
                document.getElementById(`laporan-tab-${next.key}`)?.focus()
              }}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                activeTab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="pt-4" id="laporan-panel" role="tabpanel" aria-labelledby={`laporan-tab-${activeTab}`} tabIndex={0}>
          {activeTab === 'laba-rugi' && <LabaRugiTab data={data} dari={dari} sampai={sampai} />}
          {activeTab === 'per-peron' && <PerPeronTab data={data} dari={dari} sampai={sampai} />}
          {activeTab === 'pembelian-bulanan' && <PembelianBulananTab bulan={bulan} onBulanChange={setBulan} />}
          {activeTab === 'buku-kas' && (
            <KasTab
              title="Buku Kas (Tunai)"
              transaksi={data.kasTransaksi}
              saldoAwal={data.saldoAwalKas}
              csvFilename={`buku-kas-${dari}-${sampai}.csv`}
              xlsxFilename={`buku-kas-${dari}-${sampai}.xlsx`}
            />
          )}
          {activeTab === 'mutasi-bank' && (
            <KasTab
              title="Mutasi Bank"
              transaksi={data.briTransaksi}
              saldoAwal={data.saldoAwalBri}
              csvFilename={`mutasi-bank-${dari}-${sampai}.csv`}
              xlsxFilename={`mutasi-bank-${dari}-${sampai}.xlsx`}
            />
          )}
          {activeTab === 'pajak' && <PajakTab tahun={taxTahun} onTahunChange={setTaxTahun} />}
          {activeTab === 'tahunan' && <LabaRugiTahunanTab tahun={taxTahun} onTahunChange={setTaxTahun} />}
          {activeTab === 'neraca' && <NeracaTab />}
        </div>
      </div>
    </div>
  )
}
