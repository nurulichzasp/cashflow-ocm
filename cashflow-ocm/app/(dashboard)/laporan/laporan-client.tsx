'use client'

import { useState, useTransition } from 'react'
import { getLaporanData } from './actions'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Download, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TransaksiKas, AkunKas } from '@/lib/db/schema'

type LaporanData = Awaited<ReturnType<typeof getLaporanData>>
type TabKey = 'laba-rugi' | 'per-peron' | 'buku-kas' | 'mutasi-bank'
type KasRow = TransaksiKas & { akun: AkunKas | null }

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
  const { totalPenjualan, totalPembelian, totalBiaya, labaBersih, totalKeuntungan } = data.labaRugi
  const labaKotor = totalPenjualan - totalPembelian

  const exportRows = [
    { Keterangan: 'Pendapatan Penjualan (lunas)', 'Jumlah (Rp)': totalPenjualan },
    { Keterangan: 'HPP – Pembelian (lunas)', 'Jumlah (Rp)': totalPembelian },
    { Keterangan: 'Laba Kotor', 'Jumlah (Rp)': labaKotor },
    { Keterangan: 'Biaya Operasional', 'Jumlah (Rp)': totalBiaya },
    { Keterangan: 'Laba Bersih', 'Jumlah (Rp)': labaBersih },
    { Keterangan: 'Estimasi Laba Pembelian', 'Jumlah (Rp)': totalKeuntungan },
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
      <div className="rounded-lg border overflow-hidden max-w-md">
        <table className="w-full text-sm">
          <tbody>
            {[
              { label: 'Pendapatan Penjualan (lunas)', value: totalPenjualan, cls: 'text-foreground' },
              { label: 'HPP – Pembelian (lunas)', value: totalPembelian, cls: 'text-muted-foreground' },
              { label: 'Laba Kotor', value: labaKotor, cls: 'font-semibold text-foreground', bg: 'bg-muted/30', sep: true },
              { label: 'Biaya Operasional', value: totalBiaya, cls: 'text-muted-foreground' },
              { label: 'Laba Bersih', value: labaBersih, cls: 'font-semibold text-foreground', bg: 'bg-muted/30', sep: true },
              { label: 'Estimasi Laba Pembelian', value: totalKeuntungan, cls: 'text-foreground font-semibold' },
            ].map((row, i) => (
              <tr key={i} className={cn('border-b last:border-0', row.sep ? 'border-t-2 border-t-border' : '', row.bg ?? '')}>
                <td className={cn('px-4 py-3', row.cls)}>{row.label}</td>
                <td className={cn('px-4 py-3 text-right tabular-nums', row.cls)}>{formatRupiah(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PerPeronTab({ data, dari, sampai }: { data: LaporanData; dari: string; sampai: string }) {
  const exportRows = data.laporanPeron.map((p) => ({
    Peron: p.nama,
    'Jumlah Tiket': p.jumlahTiket,
    'Total Beli (Rp)': p.totalBeli,
    'Keuntungan (Rp)': p.keuntungan,
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
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Peron</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tiket</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Beli</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Keuntungan</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">DP Aktif</th>
              </tr>
            </thead>
            <tbody>
              {data.laporanPeron.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className="px-4 py-3 font-medium">{p.nama}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.jumlahTiket}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(p.totalBeli)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-600">{formatRupiah(p.keuntungan)}</td>
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
  title, transaksi, saldoAwal, dari, sampai, csvFilename, xlsxFilename,
}: {
  title: string
  transaksi: KasRow[]
  saldoAwal: number
  dari: string
  sampai: string
  csvFilename: string
  xlsxFilename: string
}) {
  let running = saldoAwal
  const rowsWithBalance = transaksi.map((t) => {
    running += t.arah === 'masuk' ? t.jumlah : -t.jumlah
    return { ...t, saldo: running }
  })
  const saldoAkhir = running

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
            <p className={cn('text-lg font-semibold', saldoAkhir < 0 ? 'text-destructive' : '')}>
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
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
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
                    {t.arah === 'masuk' ? (
                      <span className="inline-flex rounded-full bg-[#3B82F6]/10 px-2 py-0.5 text-xs font-medium text-[#3B82F6] dark:text-[#3B82F6] border border-[#3B82F6]/25">
                        Masuk
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 border border-red-200">
                        Keluar
                      </span>
                    )}
                  </td>
                  <td className={cn('px-4 py-3 text-right tabular-nums font-semibold', t.arah === 'masuk' ? 'text-[#3B82F6] dark:text-[#3B82F6]' : 'text-red-500')}>
                    {t.arah === 'masuk' ? '+' : '-'}{formatRupiah(t.jumlah)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{formatRupiah(t.saldo)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.catatan ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'laba-rugi', label: 'Laba Rugi' },
    { key: 'per-peron', label: 'Per Peron' },
    { key: 'buku-kas', label: 'Buku Kas' },
    { key: 'mutasi-bank', label: 'Mutasi Bank' },
  ]

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Dari</p>
              <Input type="date" value={dari} onChange={(e) => setDari(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Sampai</p>
              <Input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} className="w-40" />
            </div>
            <Button onClick={handleTerapkan} disabled={isPending}>
              {isPending ? 'Memuat...' : 'Terapkan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Penjualan Lunas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-[#3B82F6] dark:text-[#3B82F6]">{formatRupiah(data.labaRugi.totalPenjualan)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Pembelian Lunas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-orange-600 dark:text-[#D97757]">{formatRupiah(data.labaRugi.totalPembelian)}</p>
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
            <p className="text-xl font-semibold text-stone-900 dark:text-stone-100">
              {formatRupiah(data.labaRugi.totalKeuntungan)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex border-b overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                activeTab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="pt-4">
          {activeTab === 'laba-rugi' && <LabaRugiTab data={data} dari={dari} sampai={sampai} />}
          {activeTab === 'per-peron' && <PerPeronTab data={data} dari={dari} sampai={sampai} />}
          {activeTab === 'buku-kas' && (
            <KasTab
              title="Buku Kas (Tunai)"
              transaksi={data.kasTransaksi}
              saldoAwal={data.saldoAwalKas}
              dari={dari} sampai={sampai}
              csvFilename={`buku-kas-${dari}-${sampai}.csv`}
              xlsxFilename={`buku-kas-${dari}-${sampai}.xlsx`}
            />
          )}
          {activeTab === 'mutasi-bank' && (
            <KasTab
              title="Mutasi Bank"
              transaksi={data.briTransaksi}
              saldoAwal={data.saldoAwalBri}
              dari={dari} sampai={sampai}
              csvFilename={`mutasi-bank-${dari}-${sampai}.csv`}
              xlsxFilename={`mutasi-bank-${dari}-${sampai}.xlsx`}
            />
          )}
        </div>
      </div>
    </div>
  )
}
