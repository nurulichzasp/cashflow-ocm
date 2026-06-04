'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Printer, FileText, Thermometer, Zap } from 'lucide-react'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { fotoUrl } from '@/lib/foto-url'
import type { Pembelian, Peron, AkunKas, PembelianFoto, PembelianDetail } from '@/lib/db/schema'

type PembelianRow = Pembelian & { peron: Peron | null; sumberBayar: AkunKas | null; fotos: PembelianFoto[]; details: PembelianDetail[] }

function formatWaktu(date: Date | number | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'number' ? new Date(date * 1000) : date
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function sumberBayarLabel(akun: AkunKas | null): string {
  if (!akun) return '—'
  return akun.tipe === 'bank' ? 'Transfer' : 'Tunai'
}

function getDetails(p: PembelianRow) {
  if (p.details && p.details.length > 0) return p.details
  return [{
    id: '', pembelianId: p.id, urutan: 0,
    noTid: p.noTid ?? null, nopol: p.nopol ?? null, supir: p.supir ?? null,
    tonase: p.tonase, hargaLapangan: p.hargaBeli,
    subtotalBeli: p.totalBeli, subtotalJual: p.totalJual, keuntungan: p.keuntungan,
  }]
}

function getThermalWidth(): number {
  if (typeof window === 'undefined') return 58
  const stored = localStorage.getItem('thermal_paper_width')
  return stored === '80' ? 80 : 58
}

// ── Nota Lengkap (A5) ────────────────────────────────────────────────────────

function buildNotaHTML(p: PembelianRow): string {
  const details = getDetails(p)
  const waktu = formatWaktu(p.createdAt)
  const sumberLabel = sumberBayarLabel(p.sumberBayar)

  const detailRows = details.map((d) => `
    <tr>
      <td class="r">${d.tonase.toLocaleString('id-ID')} kg</td>
      <td class="r">Rp ${d.hargaLapangan.toLocaleString('id-ID')}</td>
      <td class="r b">${formatRupiah(d.subtotalBeli)}</td>
    </tr>
    ${d.nopol || d.supir ? `<tr class="sub"><td colspan="3" class="sub-td">${[d.nopol, d.supir].filter(Boolean).join(' · ')}</td></tr>` : ''}
  `).join('')

  const fotoHtml = p.fotos && p.fotos.length > 0
    ? `<div class="foto-section"><p class="section-label">Foto Bukti</p><div class="foto-strip">${p.fotos.map((f) => `<img src="${fotoUrl(f.url, { absolute: true })}" alt="Foto" class="foto-thumb" />`).join('')}</div></div>`
    : ''

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Nota Pembelian - ${p.peron?.nama ?? ''}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11px;color:#1c1917;background:#fff}
  .wrap{max-width:460px;margin:0 auto;padding:24px 20px}
  .hd{text-align:center;padding-bottom:10px;border-bottom:2px solid #ea580c;margin-bottom:14px}
  .brand{font-size:18px;font-weight:700;color:#ea580c}
  .brand-sub{font-size:8.5px;color:#78716c;margin-top:1px}
  .nota-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#44403c;margin-top:6px}
  .meta{display:flex;justify-content:space-between;margin-bottom:12px;font-size:10.5px;color:#57534e}
  .meta .lbl{color:#a8a29e;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:1px}
  .meta .val{font-weight:600}
  .kat{display:inline-block;padding:1px 7px;border-radius:999px;font-size:8.5px;font-weight:700}
  .kat-OCMR1{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
  .kat-OCMR2{background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe}
  .kat-OCMPSAGU{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
  .kat-OCMBRDL{background:#fffbeb;color:#b45309;border:1px solid #fde68a}
  table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:10.5px}
  thead th{background:#f5f5f4;padding:5px 6px;text-align:left;font-size:8.5px;text-transform:uppercase;letter-spacing:0.06em;color:#78716c;font-weight:700;border-bottom:1.5px solid #e7e5e4}
  th.r{text-align:right}
  td{padding:5px 6px;border-bottom:1px dashed #f5f5f4;vertical-align:top}
  td.r{text-align:right;font-variant-numeric:tabular-nums}
  td.b{font-weight:700}
  tr.sub td.sub-td{padding:1px 6px 5px 6px;font-size:9.5px;color:#a8a29e;border-bottom:1px dashed #f5f5f4}
  .divider-double{border:none;border-top:2.5px double #e7e5e4;margin:8px 0}
  .total-row{display:flex;justify-content:space-between;padding:5px 0}
  .total-row .lbl{font-weight:700;font-size:12px}
  .total-row .val{font-weight:700;font-size:13px}
  .info-row{display:flex;justify-content:space-between;padding:3.5px 0;font-size:10.5px;border-bottom:1px dashed #f5f5f4}
  .info-row .lbl{color:#78716c}
  .info-row .val{font-weight:600}
  .st{display:inline-block;padding:1px 7px;border-radius:999px;font-size:8.5px;font-weight:700}
  .st-lunas{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
  .st-belum{background:#fffbeb;color:#b45309;border:1px solid #fde68a}
  .catatan{background:#f5f5f4;border-radius:5px;padding:6px 8px;font-size:10px;color:#57534e;margin-top:8px}
  .catatan-lbl{font-weight:700;font-size:8.5px;text-transform:uppercase;letter-spacing:0.05em;color:#a8a29e;margin-bottom:2px}
  .section-label{font-size:8.5px;text-transform:uppercase;letter-spacing:0.05em;color:#a8a29e;font-weight:700;margin-bottom:5px}
  .foto-section{margin-top:10px}
  .foto-strip{display:flex;flex-wrap:wrap;gap:5px}
  .foto-thumb{height:72px;width:72px;object-fit:cover;border-radius:4px;border:1px solid #e7e5e4}
  .footer{text-align:center;font-size:8.5px;color:#a8a29e;margin-top:14px;padding-top:10px;border-top:1px solid #e7e5e4}
  .no-print{margin-bottom:14px}
  .print-btn{background:#ea580c;color:#fff;border:none;padding:6px 16px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer}
  @media print{.no-print{display:none}@page{margin:8mm;size:A5}body{background:#fff}}
</style>
</head>
<body>
<div class="wrap">
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">&#128438; Cetak / Simpan PDF</button>
  </div>

  <div class="hd">
    <div class="brand">CV OCM</div>
    <div class="brand-sub">Supplier TBS &amp; BRDL &mdash; PKS PT. BGA</div>
    <div class="nota-title">Nota Pembelian</div>
  </div>

  <div class="meta">
    <div>
      <span class="lbl">Tanggal</span>
      <span class="val">${formatTanggal(p.tanggal)}${waktu ? ` &nbsp;·&nbsp; ${waktu}` : ''}</span>
    </div>
    <div style="text-align:right">
      <span class="lbl">Peron</span>
      <span class="val">${p.peron?.nama ?? p.peronId}</span>
    </div>
    <div style="text-align:right">
      <span class="lbl">Kategori</span>
      <span class="kat kat-${p.kategori.replace(/\s/g,'')}">${p.kategori}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="r">Tonase</th>
        <th class="r">Harga</th>
        <th class="r">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${detailRows}
    </tbody>
  </table>

  <hr class="divider-double" />

  <div class="total-row">
    <span class="lbl">Total</span>
    <span class="val">${formatRupiah(p.totalBeli)}</span>
  </div>

  <div style="margin-top:8px">
    <div class="info-row">
      <span class="lbl">Status Bayar</span>
      <span class="val"><span class="st st-${p.statusBayarPeron}">${p.statusBayarPeron === 'lunas' ? 'Lunas' : 'Belum Dibayar'}</span></span>
    </div>
    ${p.sumberBayar ? `<div class="info-row"><span class="lbl">Pembayaran</span><span class="val">${sumberLabel}</span></div>` : ''}
  </div>

  ${p.catatan ? `<div class="catatan"><div class="catatan-lbl">Catatan</div>${p.catatan}</div>` : ''}

  ${fotoHtml}

  <div class="footer">Dicetak oleh sistem Cashflow CV OCM &bull; ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
</div>
</body>
</html>`
}

// ── Nota Thermal ─────────────────────────────────────────────────────────────

function buildThermalHTML(p: PembelianRow, paperWidthMm: number): string {
  const details = getDetails(p)
  const waktu = formatWaktu(p.createdAt)
  const sumberLabel = sumberBayarLabel(p.sumberBayar)
  const charWidth = paperWidthMm === 80 ? 42 : 32
  const divider = '-'.repeat(charWidth)
  const doubleDivider = '='.repeat(charWidth)

  function padLine(left: string, right: string, width: number): string {
    const spaces = width - left.length - right.length
    return left + ' '.repeat(Math.max(1, spaces)) + right
  }

  const itemRows = details.map((d) => {
    const tonase = `${d.tonase.toLocaleString('id-ID')}kg`
    const harga = `${d.hargaLapangan.toLocaleString('id-ID')}`
    const sub = formatRupiah(d.subtotalBeli)
    const line1 = `${tonase} x ${harga}`
    const sub2 = `  = ${sub}`
    const nopolSupir = [d.nopol, d.supir].filter(Boolean).join(' / ')
    return `<div>${line1}</div><div style="text-align:right">${sub}</div>${nopolSupir ? `<div style="color:#666;font-size:8pt">${nopolSupir}</div>` : ''}`
  }).join('<div style="border-top:1px dashed #ccc;margin:2px 0"></div>')

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nota Thermal - ${p.peron?.nama ?? ''}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',Courier,monospace;font-size:11pt;color:#000;background:#f2f2f2;min-height:100vh}
  .wrap{max-width:400px;margin:0 auto;background:#fff;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.12)}
  .center{text-align:center}
  .right{text-align:right}
  .bold{font-weight:bold}
  .divider{border-top:1px dashed #000;margin:5px 0}
  .solid{border-top:1.5px solid #000;margin:5px 0}
  .row{display:flex;justify-content:space-between;align-items:baseline;gap:4px;line-height:1.6}
  .row .l{flex:1;white-space:nowrap;overflow:hidden;text-overflow:clip}
  .row .r{text-align:right;white-space:nowrap;font-weight:bold}
  .small{font-size:9pt;color:#444}
  .items{margin:6px 0}
  .item{margin:5px 0}
  .item-sub{font-size:8.5pt;color:#555;padding-left:4px}
  .status-lunas{font-weight:bold}
  .status-belum{font-weight:bold}
  .no-print{margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap}
  .print-btn{background:#1c1917;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-size:12pt;cursor:pointer;font-family:Arial,sans-serif;flex:1}
  .share-btn{background:#ea580c;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-size:12pt;cursor:pointer;font-family:Arial,sans-serif;flex:1}
  @media print{
    .no-print{display:none}
    body{background:#fff;font-size:${paperWidthMm === 80 ? '9.5' : '8.5'}pt}
    .wrap{max-width:none;box-shadow:none;padding:1mm}
    @page{size:${paperWidthMm}mm auto;margin:2mm}
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">&#128438; Cetak</button>
    <button class="share-btn" onclick="bagikanNota()">&#8679; Bagikan</button>
  </div>
  <script>
  function bagikanNota(){
    var btns=document.querySelector('.no-print');
    btns.style.display='none';
    var html='<!DOCTYPE html>'+document.documentElement.outerHTML;
    btns.style.display='';
    var blob=new Blob([html],{type:'text/html'});
    var file=new File([blob],'nota-pembelian-${p.peron?.nama?.replace(/\s/g,'-') ?? 'ocm'}.html',{type:'text/html'});
    if(navigator.share){
      var shareData={title:'Nota Pembelian CV OCM - ${p.peron?.nama ?? ''}',text:'Nota pembelian ${formatTanggal(p.tanggal)} - ${formatRupiah(p.totalBeli)}'};
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        shareData.files=[file];
      }
      navigator.share(shareData).catch(function(){});
    } else {
      var a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='nota-pembelian.html';
      a.click();
    }
  }
  </script>

  <div class="center bold" style="font-size:11pt;letter-spacing:1px">CV OCM</div>
  <div class="center small">Supplier TBS &amp; BRDL</div>
  <div class="center small">PKS PT. BGA</div>
  <div class="solid"></div>
  <div class="center bold" style="letter-spacing:1px">NOTA PEMBELIAN</div>
  <div class="divider"></div>

  <div class="row"><span class="l">Tanggal</span><span class="r">${formatTanggal(p.tanggal)}</span></div>
  ${waktu ? `<div class="row"><span class="l">Waktu</span><span class="r">${waktu}</span></div>` : ''}
  <div class="row"><span class="l">Peron</span><span class="r">${p.peron?.nama ?? p.peronId}</span></div>
  <div class="row"><span class="l">Kategori</span><span class="r">${p.kategori}</span></div>
  <div class="divider"></div>

  <div style="font-size:7.5pt;margin-bottom:2px">RINCIAN TONASE</div>
  <div class="items">
    ${details.map((d) => {
      const nopolSupir = [d.nopol, d.supir].filter(Boolean).join(' / ')
      return `<div class="item">
        <div class="row"><span class="l">${d.tonase.toLocaleString('id-ID')} kg x Rp ${d.hargaLapangan.toLocaleString('id-ID')}</span></div>
        <div class="row"><span class="l small">= subtotal</span><span class="r">${formatRupiah(d.subtotalBeli)}</span></div>
        ${nopolSupir ? `<div class="item-sub">${nopolSupir}</div>` : ''}
      </div>`
    }).join('<div class="divider"></div>')}
  </div>
  <div class="solid"></div>

  <div class="row bold" style="font-size:10pt">
    <span class="l">TOTAL</span>
    <span class="r">${formatRupiah(p.totalBeli)}</span>
  </div>
  <div class="divider"></div>

  <div class="row"><span class="l">Status</span><span class="r status-${p.statusBayarPeron}">${p.statusBayarPeron === 'lunas' ? 'LUNAS' : 'BELUM DIBAYAR'}</span></div>
  ${p.sumberBayar ? `<div class="row"><span class="l">Pembayaran</span><span class="r">${sumberLabel}</span></div>` : ''}

  ${p.catatan ? `<div class="divider"></div><div style="font-size:7.5pt;margin-bottom:1px">CATATAN:</div><div style="font-size:8pt">${p.catatan}</div>` : ''}

  <div class="solid"></div>
  <div class="center small" style="margin-top:2px">${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
  <div class="center small">Cashflow CV OCM</div>
</div>
</body>
</html>`
}

// ── Rekap Lengkap ────────────────────────────────────────────────────────────

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

  const rows = list.map((p) => {
    const details = getDetails(p)
    const fotoHtml = p.fotos && p.fotos.length > 0
      ? `<tr class="foto-row"><td colspan="8"><div class="foto-strip">${p.fotos.map((f) => `<img src="${fotoUrl(f.url, { absolute: true })}" alt="Foto" class="foto-thumb" />`).join('')}</div></td></tr>`
      : ''
    const detailsHtml = details.map((d, i) => `
      <tr class="${i > 0 ? 'detail-extra' : ''}">
        ${i === 0 ? `<td rowspan="${details.length}">${formatTanggal(p.tanggal)}</td>` : ''}
        ${i === 0 ? `<td rowspan="${details.length}"><span class="kat kat-${p.kategori.replace(/\s/g,'')}">${p.kategori}</span></td>` : ''}
        ${i === 0 ? `<td rowspan="${details.length}">${p.peron?.nama ?? p.peronId}</td>` : ''}
        <td class="r">${d.tonase.toLocaleString('id-ID')} kg</td>
        <td class="r">Rp ${d.hargaLapangan.toLocaleString('id-ID')}</td>
        <td class="r b">${formatRupiah(d.subtotalBeli)}</td>
        ${i === 0 ? `<td rowspan="${details.length}"><span class="st st-${p.statusBayarPeron}">${p.statusBayarPeron === 'lunas' ? 'Lunas' : 'Belum'}</span></td>` : ''}
      </tr>
    `).join('')
    return detailsHtml + fotoHtml
  }).join('')

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
  td.mono{font-family:monospace;font-size:9.5px}
  .kat{display:inline-block;padding:1px 6px;border-radius:999px;font-size:8.5px;font-weight:700}
  .kat-OCMR1{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
  .kat-OCMR2{background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe}
  .kat-OCMPSAGU{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
  .kat-OCMBRDL{background:#fffbeb;color:#b45309;border:1px solid #fde68a}
  .st{display:inline-block;padding:1px 6px;border-radius:999px;font-size:8.5px;font-weight:700}
  .st-lunas{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
  .st-belum{background:#fffbeb;color:#b45309;border:1px solid #fde68a}
  tfoot td{font-weight:700;border-top:2px solid #e7e5e4;border-bottom:none;padding-top:8px;font-size:11px}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
  .scard{border:1px solid #e7e5e4;border-radius:6px;padding:8px 12px}
  .scard .sl{font-size:8.5px;text-transform:uppercase;letter-spacing:0.06em;color:#a8a29e;margin-bottom:2px}
  .scard .sv{font-size:13px;font-weight:700;color:#1c1917}
  .scard.green .sv{color:#15803d}
  .no-print{margin-bottom:16px}
  .print-btn{background:#ea580c;color:#fff;border:none;padding:7px 18px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer}
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
      <div class="periode">Periode: ${periodeLabel} &mdash; ${list.length} transaksi</div>
    </div>
  </div>

  <div class="summary">
    <div class="scard"><div class="sl">Total Tonase</div><div class="sv">${totalTonase.toLocaleString('id-ID')} kg</div></div>
    <div class="scard"><div class="sl">Total Jual BGA</div><div class="sv">${formatRupiah(totalJual)}</div></div>
    <div class="scard"><div class="sl">Total Beli (Dibayar)</div><div class="sv">${formatRupiah(totalBeli)}</div></div>
    <div class="scard green"><div class="sl">Total Keuntungan</div><div class="sv">${formatRupiah(totalUntung)}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Tanggal</th>
        <th>Kat</th>
        <th>Peron</th>
        <th class="r">Tonase</th>
        <th class="r">Harga</th>
        <th class="r">Subtotal</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="color:#44403c">TOTAL (${list.length} transaksi)</td>
        <td class="r">${totalTonase.toLocaleString('id-ID')} kg</td>
        <td></td>
        <td class="r">${formatRupiah(totalBeli)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>
</div>
</body>
</html>`
}

// ── Thermer URL (thermer:// custom scheme) ───────────────────────────────────

type ThermerEntry =
  | { type: 0; content: string; bold: 0 | 1; align: 0 | 1 | 2; format: 0 | 1 | 2 | 3 | 4 }
  | { type: 1; path: string; align: 0 | 1 | 2 }
  | { type: 2; value: string; height: number; align: 0 | 1 | 2 }
  | { type: 3; value: string; size: number; align: 0 | 1 | 2 }

function txt(content: string, bold: 0 | 1 = 0, align: 0 | 1 | 2 = 0, format: 0 | 1 | 2 | 3 | 4 = 0): ThermerEntry {
  return { type: 0, content, bold, align, format }
}

function buildThermerURL(p: PembelianRow): string {
  const details = getDetails(p)
  const paperWidthMm = getThermalWidth()
  const div = '-'.repeat(paperWidthMm === 80 ? 42 : 32)
  const equ = '='.repeat(paperWidthMm === 80 ? 42 : 32)
  const waktu = formatWaktu(p.createdAt)
  const sumberLabel = p.sumberBayar ? (p.sumberBayar.tipe === 'bank' ? 'Transfer' : 'Tunai') : null

  const entries: ThermerEntry[] = [
    txt('CV OCM', 1, 1, 2),
    txt('Omanda Cerli Mandiri', 0, 1, 4),
    txt(equ, 0, 1),
    txt('NOTA PEMBELIAN', 1, 1),
    txt(div, 0, 1),
    txt(`Tanggal : ${formatTanggal(p.tanggal)}${waktu ? '  ' + waktu : ''}`),
    txt(`Peron   : ${p.peron?.nama ?? p.peronId}`),
    txt(`Kategori: ${p.kategori}`),
    txt(div, 0, 1),
    txt('RINCIAN TONASE', 0, 0, 4),
    ...details.flatMap((d): ThermerEntry[] => {
      const nopolSupir = [d.nopol, d.supir].filter(Boolean).join(' / ')
      return [
        txt(`${d.tonase.toLocaleString('id-ID')} kg x Rp ${d.hargaLapangan.toLocaleString('id-ID')}`),
        txt(`= ${formatRupiah(d.subtotalBeli)}`, 0, 2),
        ...(nopolSupir ? [txt(nopolSupir, 0, 0, 4)] : []),
        txt(div, 0, 1),
      ]
    }),
    txt('TOTAL', 1, 0),
    txt(formatRupiah(p.totalBeli), 1, 2, 1),
    txt(equ, 0, 1),
    txt(`Status  : ${p.statusBayarPeron === 'lunas' ? 'LUNAS' : 'BELUM DIBAYAR'}`, 1),
    ...(sumberLabel ? [txt(`Bayar   : ${sumberLabel}`)] : []),
    ...(p.catatan ? [txt(div, 0, 1), txt('Catatan:', 0, 0, 4), txt(p.catatan)] : []),
    txt(equ, 0, 1),
    txt(new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }), 0, 1, 4),
    txt('CV Omanda Cerli Mandiri', 0, 1, 4),
    txt(div, 0, 1),
    txt('Terima kasih atas kepercayaan Anda!', 0, 1, 0),
  ]

  const dict: Record<string, ThermerEntry> = {}
  entries.forEach((e, i) => { dict[String(i).padStart(3, '0')] = e })
  return `thermer://?data=${encodeURIComponent(JSON.stringify(dict))}`
}

// ── Komponen Tombol ──────────────────────────────────────────────────────────

export function PrintNotaButton({ pembelian }: { pembelian: PembelianRow }) {
  function handlePrintLengkap() {
    const html = buildNotaHTML(pembelian)
    const win = window.open('', '_blank', 'width=600,height=750')
    if (!win) { alert('Pop-up diblokir. Izinkan pop-up untuk halaman ini.'); return }
    win.document.open(); win.document.write(html); win.document.close()
  }

  function handlePrintThermal() {
    const width = getThermalWidth()
    const html = buildThermalHTML(pembelian, width)
    const win = window.open('', '_blank', `width=${width === 80 ? 400 : 320},height=600`)
    if (!win) { alert('Pop-up diblokir. Izinkan pop-up untuk halaman ini.'); return }
    win.document.open(); win.document.write(html); win.document.close()
  }

  function handlePrintThermer() {
    window.location.href = buildThermerURL(pembelian)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-center h-7 w-7 rounded-md text-stone-500 hover:text-orange-600 hover:bg-orange-50 transition-colors focus:outline-none" title="Cetak Nota">
        <Printer className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handlePrintLengkap} className="gap-2 cursor-pointer">
          <FileText className="h-3.5 w-3.5" />
          Print Lengkap (A5)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrintThermal} className="gap-2 cursor-pointer">
          <Thermometer className="h-3.5 w-3.5" />
          Print Thermal (preview)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrintThermer} className="gap-2 cursor-pointer text-orange-600 focus:text-orange-600 focus:bg-orange-50">
          <Zap className="h-3.5 w-3.5" />
          Thermer (langsung)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PrintRekapButton({ pembelianList }: { pembelianList: PembelianRow[] }) {
  function handlePrint() {
    const html = buildRekapHTML(pembelianList)
    const win = window.open('', '_blank', 'width=1000,height=750')
    if (!win) { alert('Pop-up diblokir. Izinkan pop-up untuk halaman ini.'); return }
    win.document.open(); win.document.write(html); win.document.close()
  }
  return (
    <Button variant="outline" size="sm" className="gap-2 border-stone-200 text-stone-700 hover:bg-stone-50" onClick={handlePrint} title="Cetak Rekap">
      <Printer className="h-4 w-4" />
      Cetak Rekap
    </Button>
  )
}
