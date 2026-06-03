'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { formatRupiah, formatTanggal } from '@/lib/format'
import type { Pembelian, Peron, AkunKas, PembelianFoto } from '@/lib/db/schema'

type PembelianRow = Pembelian & { peron: Peron | null; sumberBayar: AkunKas | null; fotos: PembelianFoto[] }

function buildRekapHTML(list: PembelianRow[]): string {
  if (list.length === 0) return '<p>Tidak ada data</p>'

  const totalTonase = list.reduce((s, p) => s + p.tonase, 0)
  const totalBeli = list.reduce((s, p) => s + p.totalBeli, 0)
  const totalJual = list.reduce((s, p) => s + p.totalJual, 0)
  const totalUntung = list.reduce((s, p) => s + p.keuntungan, 0)

  const tanggalMin = list.map((p) => p.tanggal).sort()[0]
  const tanggalMax = list.map((p) => p.tanggal).sort().reverse()[0]
  const periodeLabel = tanggalMin === tanggalMax
    ? formatTanggal(tanggalMin)
    : `${formatTanggal(tanggalMin)} – ${formatTanggal(tanggalMax)}`

  const rows = list
    .map(
      (p) => {
        const fotoHtml = p.fotos && p.fotos.length > 0
          ? `<tr class="foto-row"><td colspan="10"><div class="foto-strip">${p.fotos.map((f) => `<img src="${f.url}" alt="Foto bukti" class="foto-thumb" />`).join('')}</div></td></tr>`
          : ''
        return `
      <tr>
        <td>${formatTanggal(p.tanggal)}</td>
        <td class="mono">${p.noTid ?? '—'}</td>
        <td><span class="kat kat-${p.kategori.replace(' ', '')}">${p.kategori}</span></td>
        <td>${p.peron?.nama ?? p.peronId}</td>
        <td class="r">${p.tonase.toLocaleString('id-ID')} kg</td>
        <td class="r">${p.hargaJual.toLocaleString('id-ID')}</td>
        <td class="r">${p.hargaBeli.toLocaleString('id-ID')}</td>
        <td class="r b">${formatRupiah(p.totalBeli)}</td>
        <td class="r g">${formatRupiah(p.keuntungan)}</td>
        <td><span class="st st-${p.statusBayarPeron}">${p.statusBayarPeron === 'lunas' ? 'Lunas' : 'Belum'}</span></td>
      </tr>${fotoHtml}`
      }
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Rekap Pembelian CV OCM</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11px;color:#1c1917;background:#fff}
  .wrap{max-width:960px;margin:0 auto;padding:28px 24px}
  .hd{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2.5px solid #ea580c;margin-bottom:18px}
  .brand{font-size:20px;font-weight:700;color:#ea580c}
  .brand-sub{font-size:9px;color:#78716c;margin-top:2px}
  .title-block{text-align:right}
  .title{font-size:13px;font-weight:700;color:#44403c;text-transform:uppercase;letter-spacing:0.04em}
  .periode{font-size:11px;color:#78716c;margin-top:2px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:10.5px}
  thead th{background:#f5f5f4;padding:6px 8px;text-align:left;font-size:8.5px;text-transform:uppercase;letter-spacing:0.06em;color:#78716c;font-weight:700;border-bottom:1.5px solid #e7e5e4}
  th.r{text-align:right}
  td{padding:5.5px 8px;border-bottom:1px solid #f5f5f4;vertical-align:middle}
  td.r{text-align:right;font-variant-numeric:tabular-nums}
  td.b{font-weight:700}
  td.g{font-weight:700;color:#15803d}
  td.mono{font-family:monospace;font-size:9.5px}
  .kat{display:inline-block;padding:1px 6px;border-radius:999px;font-size:8.5px;font-weight:700}
  .kat-RING1{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
  .kat-RING2{background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe}
  .kat-BRDL{background:#fffbeb;color:#b45309;border:1px solid #fde68a}
  .st{display:inline-block;padding:1px 6px;border-radius:999px;font-size:8.5px;font-weight:700}
  .st-lunas{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
  .st-belum{background:#fffbeb;color:#b45309;border:1px solid #fde68a}
  tfoot td{font-weight:700;border-top:2px solid #e7e5e4;border-bottom:none;padding-top:8px;font-size:11px}
  tfoot .label{color:#44403c}
  tfoot .g{color:#15803d}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
  .scard{border:1px solid #e7e5e4;border-radius:6px;padding:8px 12px}
  .scard .sl{font-size:8.5px;text-transform:uppercase;letter-spacing:0.06em;color:#a8a29e;margin-bottom:2px}
  .scard .sv{font-size:13px;font-weight:700;color:#1c1917}
  .scard.green .sv{color:#15803d}
  .no-print{margin-bottom:16px}
  .print-btn{background:#ea580c;color:#fff;border:none;padding:7px 18px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px}
  .print-btn:hover{background:#c2410c}
  .foto-row td{padding:4px 8px 10px 8px;border-bottom:1.5px solid #e7e5e4}
  .foto-strip{display:flex;flex-wrap:wrap;gap:6px}
  .foto-thumb{height:80px;width:80px;object-fit:cover;border-radius:4px;border:1px solid #e7e5e4}
  @media print{.no-print{display:none}@page{margin:12mm}body{background:#fff}}
</style>
</head>
<body>
<div class="wrap">
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">&#128438; Cetak / Simpan PDF</button>
  </div>

  <div class="hd">
    <div>
      <div class="brand">CV OCM</div>
      <div class="brand-sub">Supplier TBS &amp; BRDL &mdash; PKS PT. BGA</div>
    </div>
    <div class="title-block">
      <div class="title">Rekap Pembelian</div>
      <div class="periode">Periode: ${periodeLabel} &mdash; ${list.length} tiket</div>
    </div>
  </div>

  <div class="summary">
    <div class="scard">
      <div class="sl">Total Tonase</div>
      <div class="sv">${totalTonase.toLocaleString('id-ID')} kg</div>
    </div>
    <div class="scard">
      <div class="sl">Total Jual BGA</div>
      <div class="sv">${formatRupiah(totalJual)}</div>
    </div>
    <div class="scard">
      <div class="sl">Total Beli (Dibayar)</div>
      <div class="sv">${formatRupiah(totalBeli)}</div>
    </div>
    <div class="scard green">
      <div class="sl">Total Keuntungan</div>
      <div class="sv">${formatRupiah(totalUntung)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Tanggal</th>
        <th>TID</th>
        <th>Kat</th>
        <th>Peron</th>
        <th class="r">Tonase</th>
        <th class="r">H.Jual</th>
        <th class="r">H.Beli</th>
        <th class="r">Total Beli</th>
        <th class="r">Untung</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" class="label">TOTAL (${list.length} tiket)</td>
        <td class="r">${totalTonase.toLocaleString('id-ID')} kg</td>
        <td colspan="2"></td>
        <td class="r b">${formatRupiah(totalBeli)}</td>
        <td class="r g">${formatRupiah(totalUntung)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>
</div>
</body>
</html>`
}

interface Props {
  pembelianList: PembelianRow[]
}

export function PrintRekapButton({ pembelianList }: Props) {
  function handlePrint() {
    const html = buildRekapHTML(pembelianList)
    const win = window.open('', '_blank', 'width=1000,height=750')
    if (!win) {
      alert('Pop-up diblokir. Izinkan pop-up untuk halaman ini lalu coba lagi.')
      return
    }
    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 border-stone-200 text-stone-700 hover:bg-stone-50"
      onClick={handlePrint}
      title="Cetak Rekap"
    >
      <Printer className="h-4 w-4" />
      Cetak Rekap
    </Button>
  )
}
