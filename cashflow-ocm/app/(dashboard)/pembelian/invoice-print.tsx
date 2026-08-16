'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { toast } from 'sonner'
import { formatRupiah, formatTanggal, notaReplasBaris, notaKeteranganReplas } from '@/lib/format'
import { fotoUrl } from '@/lib/foto-url'
import { useHydrated } from '@/hooks/use-hydrated'
import type { Pembelian, Peron, AkunKas, PembelianFoto, PembelianDetail } from '@/lib/db/schema'

type PembelianRow = Pembelian & { peron: Peron | null; sumberBayar: AkunKas | null; fotos: PembelianFoto[]; details: PembelianDetail[] }

// Escape field bebas (nama peron, nopol, supir, catatan) sebelum ditulis ke window
// cetak via document.write — cegah XSS tersimpan (window about:blank mewarisi origin app).
function esc(v: string | null | undefined): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Escape untuk konteks string JS bertanda kutip tunggal di dalam <script> (tombol Bagikan
// nota thermal). Juga netralkan < > agar tak bisa menutup tag </script>.
function escJs(v: string | null | undefined): string {
  return String(v ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
}

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
    // Baris legacy (tanpa pembelian_detail) tak punya data replas → null seragam
    // supaya bentuknya = PembelianDetail (akses d.tanggalReplas aman di semua mode nota).
    tanggalReplas: null, tanggalReplasSampai: null, jumlahReplas: null,
  }]
}

// ── Nomor Invoice otomatis ────────────────────────────────────────────────────
// Format: NP/[Kode Peron]/[Bulan]/[Tahun]/[No Urut 3 digit per bulan per peron]
// Contoh: NP/1/06/2026/001
export function generateNoPembelian(tanggal: string, peronKode: number | null | undefined, nomorUrut: number): string {
  const bulan = tanggal.slice(5, 7)
  const tahun = tanggal.slice(0, 4)
  const kode = peronKode !== null && peronKode !== undefined ? String(peronKode) : '0'
  const urut = String(nomorUrut).padStart(3, '0')
  return `NP/${kode}/${bulan}/${tahun}/${urut}`
}

function getThermalWidth(): number {
  if (typeof window === 'undefined') return 58
  const stored = localStorage.getItem('thermal_paper_width')
  return stored === '80' ? 80 : 58
}

// ── Nota Lengkap (A5) ────────────────────────────────────────────────────────

function buildNotaHTML(p: PembelianRow, nomorUrut: number): string {
  const details = getDetails(p)
  const waktu = formatWaktu(p.createdAt)
  const sumberLabel = sumberBayarLabel(p.sumberBayar)
  const noInvoice = generateNoPembelian(p.tanggal, p.peron?.kode, nomorUrut)
  // Keterangan "Total N Replas (rentang)" — SATU sumber, di-derive saat render dari
  // field replas (identik form & SEMUA mode nota). Teks manual dihormati. Lihat
  // notaKeteranganReplas di lib/format.
  const keteranganReplas = notaKeteranganReplas(p.keterangan, details, p.tanggal)

  const detailRows = details.map((d) => {
    const meta = notaReplasBaris(d.jumlahReplas, d.tanggalReplas, d.tanggalReplasSampai)
    return `
    <tr>
      <td class="r">${d.tonase.toLocaleString('id-ID')} kg</td>
      <td class="r">Rp ${d.hargaLapangan.toLocaleString('id-ID')}</td>
      <td class="r b">${formatRupiah(d.subtotalBeli)}</td>
    </tr>
    ${meta ? `<tr class="sub"><td colspan="3" class="sub-td">${esc(meta)}</td></tr>` : ''}
    ${d.nopol || d.supir ? `<tr class="sub"><td colspan="3" class="sub-td">${[d.nopol, d.supir].filter(Boolean).map(esc).join(' · ')}</td></tr>` : ''}
  `
  }).join('')

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Nota Pembelian - ${esc(p.peron?.nama ?? '')}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11px;color:#1c1917;background:#fff}
  .wrap{max-width:460px;margin:0 auto;padding:24px 20px}
  .hd{text-align:center;padding-bottom:10px;border-bottom:2px solid #0B6E4F;margin-bottom:14px}
  .brand{font-size:18px;font-weight:700;color:#1c1917}
  .brand-sub{font-size:8.5px;color:#78716c;margin-top:1px}
  .nota-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#44403c;margin-top:6px}
  .meta{display:flex;justify-content:space-between;margin-bottom:12px;font-size:10.5px;color:#57534e}
  .meta .lbl{color:#a8a29e;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:1px}
  .meta .val{font-weight:600}
  .kat{display:inline-block;padding:1px 7px;border-radius:999px;font-size:8.5px;font-weight:700;background:#f5f5f4;color:#44403c;border:1px solid #e7e5e4}
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
  .total-row .val{font-weight:700;font-size:13px;font-variant-numeric:tabular-nums}
  .info-row{display:flex;justify-content:space-between;padding:3.5px 0;font-size:10.5px;border-bottom:1px dashed #f5f5f4}
  .info-row .lbl{color:#78716c}
  .info-row .val{font-weight:600}
  .st{display:inline-block;padding:1px 7px;border-radius:999px;font-size:8.5px;font-weight:700}
  .st-lunas{background:#ecfdf5;color:#0B6E4F;border:1px solid #a7f3d0}
  .st-belum{background:#f5f5f4;color:#78716c;border:1px solid #e7e5e4}
  .catatan{background:#f5f5f4;border-radius:5px;padding:6px 8px;font-size:10px;color:#57534e;margin-top:8px}
  .catatan-lbl{font-weight:700;font-size:8.5px;text-transform:uppercase;letter-spacing:0.05em;color:#a8a29e;margin-bottom:2px}
  .section-label{font-size:8.5px;text-transform:uppercase;letter-spacing:0.05em;color:#a8a29e;font-weight:700;margin-bottom:5px}
  .foto-section{margin-top:10px}
  .foto-strip{display:flex;flex-wrap:wrap;gap:5px}
  .foto-thumb{height:72px;width:72px;object-fit:cover;border-radius:4px;border:1px solid #e7e5e4}
  .ket-replas{text-align:center;font-size:10px;font-weight:600;color:#44403c;margin-top:10px}
  .footer{text-align:center;font-size:8.5px;color:#a8a29e;margin-top:14px;padding-top:10px;border-top:1px solid #e7e5e4}
  .no-print{margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:8px}
  .back-btn{background:#fff;color:#44403c;border:1px solid #d6d3d1;padding:6px 14px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer}
  .print-btn{background:#0E7A57;color:#fff;border:none;padding:6px 16px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer}
  @media print{.no-print{display:none}@page{margin:8mm;size:A5}body{background:#fff}}
</style>
</head>
<body>
<div class="wrap">
  <div class="no-print">
    <button class="back-btn" onclick="window.close()">&#8592; Tutup</button>
    <button class="print-btn" onclick="window.print()">&#128438; Cetak / Simpan PDF</button>
  </div>

  <div class="hd">
    <div class="brand">CV OCM</div>
    <div class="brand-sub">Supplier TBS &amp; BRDL &mdash; PKS PT. BGA</div>
    <div class="nota-title">Nota Pembelian</div>
    <div style="font-size:9px;color:#78716c;margin-top:3px;letter-spacing:0.04em">${noInvoice}</div>
  </div>

  <div class="meta">
    <div>
      <span class="lbl">Tanggal</span>
      <span class="val">${formatTanggal(p.tanggal)}${waktu ? ` &nbsp;·&nbsp; ${waktu}` : ''}</span>
    </div>
    <div style="text-align:right">
      <span class="lbl">Peron</span>
      <span class="val">${esc(p.peron?.nama ?? p.peronId)}</span>
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

  ${p.catatan ? `<div class="catatan"><div class="catatan-lbl">Catatan</div>${esc(p.catatan)}</div>` : ''}

  ${keteranganReplas ? `<div class="ket-replas">${esc(keteranganReplas)}</div>` : ''}

  <div class="footer">CV Omanda Cerli Mandiri &bull; ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
</div>
</body>
</html>`
}

// ── Nota Thermal ─────────────────────────────────────────────────────────────

function buildThermalHTML(p: PembelianRow, paperWidthMm: number, nomorUrut: number): string {
  const details = getDetails(p)
  const waktu = formatWaktu(p.createdAt)
  const sumberLabel = sumberBayarLabel(p.sumberBayar)
  const noInvoice = generateNoPembelian(p.tanggal, p.peron?.kode, nomorUrut)
  const keteranganReplas = notaKeteranganReplas(p.keterangan, details, p.tanggal)
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nota Thermal - ${esc(p.peron?.nama ?? '')}</title>
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
  .back-btn{background:#fff;color:#44403c;border:1px solid #d6d3d1;padding:8px 14px;border-radius:6px;font-size:12pt;cursor:pointer;font-family:Arial,sans-serif}
  .print-btn{background:#0E7A57;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-size:12pt;cursor:pointer;font-family:Arial,sans-serif;flex:1}
  .share-btn{background:#0E7A57;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-size:12pt;cursor:pointer;font-family:Arial,sans-serif;flex:1}
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
    <button class="back-btn" onclick="window.close()">&#8592; Tutup</button>
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
    var file=new File([blob],'nota-pembelian-${escJs(p.peron?.nama?.replace(/\s/g,'-') ?? 'ocm')}.html',{type:'text/html'});
    if(navigator.share){
      var shareData={title:'Nota Pembelian CV OCM - ${escJs(p.peron?.nama ?? '')}',text:'Nota pembelian ${formatTanggal(p.tanggal)} - ${formatRupiah(p.totalBeli)}'};
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
  <div class="center" style="font-size:8.5pt;margin-top:2px;letter-spacing:0.5px;color:#444">${noInvoice}</div>
  <div class="divider"></div>

  <div class="row"><span class="l">Tanggal</span><span class="r">${formatTanggal(p.tanggal)}</span></div>
  ${waktu ? `<div class="row"><span class="l">Waktu</span><span class="r">${waktu}</span></div>` : ''}
  <div class="row"><span class="l">Peron</span><span class="r">${esc(p.peron?.nama ?? p.peronId)}</span></div>
  <div class="row"><span class="l">Kategori</span><span class="r">${p.kategori}</span></div>
  <div class="divider"></div>

  <div style="font-size:7.5pt;margin-bottom:2px">RINCIAN TONASE</div>
  <div class="items">
    ${details.map((d) => {
      const nopolSupir = [d.nopol, d.supir].filter(Boolean).map(esc).join(' / ')
      const meta = esc(notaReplasBaris(d.jumlahReplas, d.tanggalReplas, d.tanggalReplasSampai))
      return `<div class="item">
        <div class="row"><span class="l">${d.tonase.toLocaleString('id-ID')} kg x Rp ${d.hargaLapangan.toLocaleString('id-ID')}</span></div>
        <div class="row"><span class="l small">${meta}</span><span class="r">${formatRupiah(d.subtotalBeli)}</span></div>
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

  ${p.catatan ? `<div class="divider"></div><div style="font-size:7.5pt;margin-bottom:1px">CATATAN:</div><div style="font-size:8pt">${esc(p.catatan)}</div>` : ''}

  ${keteranganReplas ? `<div class="divider"></div><div class="center bold" style="font-size:9pt">${esc(keteranganReplas)}</div>` : ''}

  <div class="solid"></div>
  <div class="center small">CV Omanda Cerli Mandiri</div>
  <div class="center bold" style="margin-top:2px">Terima kasih!</div>
</div>
</body>
</html>`
}

// ── Nota Thermal → GAMBAR (untuk Bagikan) ────────────────────────────────────
// Render struk thermal ke <canvas> (PNG), dependency-free & aman di iOS Safari
// (murni fillText + garis, tanpa foreignObject/gambar eksternal → toBlob tak taint).

type ThermalLine =
  | { kind: 'text'; text: string; align: 'l' | 'c' | 'r'; bold?: boolean; scale?: number }
  | { kind: 'pair'; left: string; right: string; bold?: boolean; scale?: number; leftScale?: number }
  | { kind: 'rule'; style: 'dash' | 'solid' }

function buildThermalLines(p: PembelianRow, nomorUrut: number): ThermalLine[] {
  const details = getDetails(p)
  const waktu = formatWaktu(p.createdAt)
  const sumberLabel = sumberBayarLabel(p.sumberBayar)
  const noInvoice = generateNoPembelian(p.tanggal, p.peron?.kode, nomorUrut)
  const keteranganReplas = notaKeteranganReplas(p.keterangan, details, p.tanggal)

  const lines: ThermalLine[] = [
    { kind: 'text', text: 'CV OCM', align: 'c', bold: true, scale: 1.55 },
    { kind: 'text', text: 'Supplier TBS & BRDL', align: 'c', scale: 0.85 },
    { kind: 'text', text: 'PKS PT. BGA', align: 'c', scale: 0.85 },
    { kind: 'rule', style: 'solid' },
    { kind: 'text', text: 'NOTA PEMBELIAN', align: 'c', bold: true },
    { kind: 'text', text: noInvoice, align: 'c', scale: 0.8 },
    { kind: 'rule', style: 'dash' },
    { kind: 'pair', left: 'Tanggal', right: formatTanggal(p.tanggal) },
    ...(waktu ? [{ kind: 'pair', left: 'Waktu', right: waktu } as ThermalLine] : []),
    { kind: 'pair', left: 'Peron', right: p.peron?.nama ?? p.peronId },
    { kind: 'pair', left: 'Kategori', right: p.kategori },
    { kind: 'rule', style: 'dash' },
    { kind: 'text', text: 'RINCIAN TONASE', align: 'l', scale: 0.8 },
    ...details.flatMap((d, i): ThermalLine[] => {
      const nopolSupir = [d.nopol, d.supir].filter(Boolean).join(' / ')
      const meta = notaReplasBaris(d.jumlahReplas, d.tanggalReplas, d.tanggalReplasSampai)
      return [
        ...(i > 0 ? [{ kind: 'rule', style: 'dash' } as ThermalLine] : []),
        { kind: 'text', text: `${d.tonase.toLocaleString('id-ID')} kg x Rp ${d.hargaLapangan.toLocaleString('id-ID')}`, align: 'l' },
        // Meta (kiri: "N | tanggal") lebih kecil dari nominal (kanan).
        { kind: 'pair', left: meta, right: formatRupiah(d.subtotalBeli), leftScale: 0.8 },
        ...(nopolSupir ? [{ kind: 'text', text: nopolSupir, align: 'l', scale: 0.8 } as ThermalLine] : []),
      ]
    }),
    { kind: 'rule', style: 'solid' },
    { kind: 'pair', left: 'TOTAL', right: formatRupiah(p.totalBeli), bold: true, scale: 1.12 },
    { kind: 'rule', style: 'dash' },
    { kind: 'pair', left: 'Status', right: p.statusBayarPeron === 'lunas' ? 'LUNAS' : 'BELUM DIBAYAR', bold: true },
    ...(p.sumberBayar ? [{ kind: 'pair', left: 'Pembayaran', right: sumberLabel } as ThermalLine] : []),
    ...(p.catatan
      ? [{ kind: 'rule', style: 'dash' } as ThermalLine, { kind: 'text', text: 'Catatan:', align: 'l', scale: 0.8 } as ThermalLine, { kind: 'text', text: p.catatan, align: 'l', scale: 0.9 } as ThermalLine]
      : []),
    ...(keteranganReplas
      ? [{ kind: 'rule', style: 'dash' } as ThermalLine, { kind: 'text', text: keteranganReplas, align: 'c', bold: true, scale: 0.9 } as ThermalLine]
      : []),
    { kind: 'rule', style: 'solid' },
    // Footer = acuan tunggal: tanpa tanggal (dulu new Date() = tgl cetak, menyesatkan).
    { kind: 'text', text: 'CV Omanda Cerli Mandiri', align: 'c', scale: 0.85 },
    { kind: 'text', text: 'Terima kasih!', align: 'c', bold: true },
  ]
  return lines
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = String(text).split(/\s+/)
  const out: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width <= maxW) { cur = test; continue }
    if (cur) { out.push(cur); cur = '' }
    if (ctx.measureText(w).width <= maxW) { cur = w; continue }
    // kata tunggal kepanjangan → pecah per karakter
    let chunk = ''
    for (const ch of w) {
      if (chunk && ctx.measureText(chunk + ch).width > maxW) { out.push(chunk); chunk = ch }
      else chunk += ch
    }
    cur = chunk
  }
  if (cur) out.push(cur)
  return out.length ? out : ['']
}

async function renderThermalNotaBlob(p: PembelianRow, nomorUrut: number): Promise<Blob | null> {
  if (typeof document === 'undefined') return null
  const SCALE = 2
  const cssW = getThermalWidth() === 80 ? 480 : 384
  const W = cssW * SCALE
  const padX = 16 * SCALE
  const innerW = W - padX * 2
  const BASE = 13 * SCALE
  const topPad = 16 * SCALE
  const botPad = 18 * SCALE

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const lines = buildThermalLines(p, nomorUrut)

  const font = (scale = 1, bold = false) => {
    const px = Math.round(BASE * scale)
    ctx.font = `${bold ? 'bold ' : ''}${px}px "Courier New", Courier, monospace`
    return px
  }
  const lh = (px: number) => Math.round(px * 1.5)

  type Prim =
    | { t: 'text'; text: string; align: 'l' | 'c' | 'r'; px: number; bold: boolean; y: number }
    | { t: 'pair'; left: string; right: string; px: number; leftPx: number; bold: boolean; y: number }
    | { t: 'rule'; style: 'dash' | 'solid'; y: number }
  const prims: Prim[] = []
  let y = topPad

  for (const line of lines) {
    if (line.kind === 'rule') {
      y += Math.round(5 * SCALE)
      prims.push({ t: 'rule', style: line.style, y })
      y += Math.round(5 * SCALE)
      continue
    }
    if (line.kind === 'text') {
      const px = font(line.scale ?? 1, line.bold)
      const wrapped = wrapText(ctx, line.text, innerW)
      for (const w of wrapped) {
        prims.push({ t: 'text', text: w, align: line.align, px, bold: !!line.bold, y })
        y += lh(px)
      }
      continue
    }
    // pair
    const px = font(line.scale ?? 1, line.bold)
    const leftPx = line.leftScale ? Math.round(BASE * line.leftScale) : px
    prims.push({ t: 'pair', left: line.left, right: line.right, px, leftPx, bold: !!line.bold, y })
    y += lh(px)
  }
  const H = y + botPad

  canvas.width = W
  canvas.height = H
  // resize mereset state → set ulang.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#000000'
  ctx.strokeStyle = '#000000'
  ctx.textBaseline = 'top'

  for (const pr of prims) {
    if (pr.t === 'rule') {
      ctx.save()
      ctx.lineWidth = pr.style === 'solid' ? 2 : 1
      ctx.setLineDash(pr.style === 'dash' ? [4 * SCALE, 4 * SCALE] : [])
      ctx.beginPath()
      ctx.moveTo(padX, pr.y)
      ctx.lineTo(W - padX, pr.y)
      ctx.stroke()
      ctx.restore()
      continue
    }
    font(pr.px / BASE, pr.bold)
    if (pr.t === 'text') {
      ctx.textAlign = pr.align === 'c' ? 'center' : pr.align === 'r' ? 'right' : 'left'
      const x = pr.align === 'c' ? W / 2 : pr.align === 'r' ? W - padX : padX
      ctx.fillText(pr.text, x, pr.y)
    } else {
      // pair: sisi kiri (mis. tanggal) bisa lebih kecil dari sisi kanan (nominal).
      ctx.textAlign = 'left'
      font(pr.leftPx / BASE, pr.bold)
      ctx.fillText(pr.left, padX, pr.y)
      ctx.textAlign = 'right'
      font(pr.px / BASE, pr.bold)
      ctx.fillText(pr.right, W - padX, pr.y)
    }
  }

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
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
        ${i === 0 ? `<td rowspan="${details.length}">${esc(p.peron?.nama ?? p.peronId)}</td>` : ''}
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
  .hd{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2.5px solid #0B6E4F;margin-bottom:18px}
  .brand{font-size:20px;font-weight:700;color:#1c1917}
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
  .kat{display:inline-block;padding:1px 6px;border-radius:999px;font-size:8.5px;font-weight:700;background:#f5f5f4;color:#44403c;border:1px solid #e7e5e4}
  .st{display:inline-block;padding:1px 6px;border-radius:999px;font-size:8.5px;font-weight:700}
  .st-lunas{background:#ecfdf5;color:#0B6E4F;border:1px solid #a7f3d0}
  .st-belum{background:#f5f5f4;color:#78716c;border:1px solid #e7e5e4}
  tfoot td{font-weight:700;border-top:2px solid #e7e5e4;border-bottom:none;padding-top:8px;font-size:11px}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
  .scard{border:1px solid #e7e5e4;border-radius:6px;padding:8px 12px}
  .scard .sl{font-size:8.5px;text-transform:uppercase;letter-spacing:0.06em;color:#a8a29e;margin-bottom:2px}
  .scard .sv{font-size:13px;font-weight:700;color:#1c1917;font-variant-numeric:tabular-nums}
  .scard.green .sv{color:#0B6E4F}
  .no-print{margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:8px}
  .back-btn{background:#fff;color:#44403c;border:1px solid #d6d3d1;padding:7px 16px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer}
  .print-btn{background:#0E7A57;color:#fff;border:none;padding:7px 18px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer}
  .foto-row td{padding:4px 8px 10px 8px;border-bottom:1.5px solid #e7e5e4}
  .foto-strip{display:flex;flex-wrap:wrap;gap:6px}
  .foto-thumb{height:80px;width:80px;object-fit:cover;border-radius:4px;border:1px solid #e7e5e4}
  @media print{.no-print{display:none}@page{margin:12mm}body{background:#fff}}
</style>
</head>
<body>
<div class="wrap">
  <div class="no-print">
    <button class="back-btn" onclick="window.close()">&#8592; Tutup</button>
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

// Thermer (printer thermal eksternal) men-DROP seluruh baris yang mengandung
// karakter NON-ASCII (mis. en-dash "–"/U+2013 dari rentang tanggal "13–15 Jun"
// → baris tanggalnya hilang sama sekali). Lipat en/em-dash → hyphen ASCII agar
// tiap baris (termasuk rentang tanggal) PASTI tampil.
function txt(content: string, bold: 0 | 1 = 0, align: 0 | 1 | 2 = 0, format: 0 | 1 | 2 | 3 | 4 = 0): ThermerEntry {
  return { type: 0, content: content.replace(/[–—]/g, '-'), bold, align, format }
}

function buildThermerURL(p: PembelianRow, nomorUrut: number): string {
  const details = getDetails(p)
  const paperWidthMm = getThermalWidth()
  const div = '-'.repeat(paperWidthMm === 80 ? 42 : 32)
  const equ = '='.repeat(paperWidthMm === 80 ? 42 : 32)
  const waktu = formatWaktu(p.createdAt)
  const sumberLabel = p.sumberBayar ? (p.sumberBayar.tipe === 'bank' ? 'Transfer' : 'Tunai') : null
  const noInvoice = generateNoPembelian(p.tanggal, p.peron?.kode, nomorUrut)
  const keteranganReplas = notaKeteranganReplas(p.keterangan, details, p.tanggal)

  const entries: ThermerEntry[] = [
    // Header IDENTIK dengan nota visual (buildThermalLines): CV OCM / Supplier TBS
    // & BRDL / PKS PT. BGA. (dulu subtitle keliru "Omanda Cerli Mandiri").
    txt('CV OCM', 1, 1, 2),
    txt('Supplier TBS & BRDL', 0, 1, 4),
    txt('PKS PT. BGA', 0, 1, 4),
    txt(equ, 0, 1),
    txt('NOTA PEMBELIAN', 1, 1),
    txt(noInvoice, 0, 1, 4),
    txt(div, 0, 1),
    // Tanggal & Waktu baris terpisah — samakan urutan dgn nota visual & cegah
    // wrap di kertas 32-char.
    txt(`Tanggal : ${formatTanggal(p.tanggal)}`),
    ...(waktu ? [txt(`Waktu   : ${waktu}`)] : []),
    txt(`Peron   : ${p.peron?.nama ?? p.peronId}`),
    txt(`Kategori: ${p.kategori}`),
    txt(div, 0, 1),
    txt('RINCIAN TONASE', 0, 0, 4),
    ...details.flatMap((d): ThermerEntry[] => {
      const nopolSupir = [d.nopol, d.supir].filter(Boolean).join(' / ')
      const meta = notaReplasBaris(d.jumlahReplas, d.tanggalReplas, d.tanggalReplasSampai)
      // Subtotal rata-KANAN via align Thermer (2), BUKAN padding spasi: Thermer
      // menggabung spasi ganda jadi satu → nominal malah nempel kiri (jelek).
      // Meta "N | tanggal" jadi baris kecil tersendiri (format 4) — Thermer
      // cuma punya 1 align + 1 ukuran per entri, jadi tak bisa sebaris dgn nominal.
      return [
        txt(`${d.tonase.toLocaleString('id-ID')} kg x Rp ${d.hargaLapangan.toLocaleString('id-ID')}`),
        ...(meta ? [txt(meta, 0, 0, 4)] : []),
        txt(formatRupiah(d.subtotalBeli), 0, 2),
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
    ...(keteranganReplas ? [txt(div, 0, 1), txt(keteranganReplas, 1, 1, 0)] : []),
    txt(equ, 0, 1),
    txt('CV Omanda Cerli Mandiri', 0, 1, 4),
    txt('Terima kasih!', 1, 1, 0),
  ]

  const dict: Record<string, ThermerEntry> = {}
  entries.forEach((e, i) => { dict[String(i).padStart(3, '0')] = e })
  return `thermer://?data=${encodeURIComponent(JSON.stringify(dict))}`
}

// ── Hooks aksi nota ──────────────────────────────────────────────────────────
// Logika cetak/share dipisah dari tampilan agar bisa dipakai oleh kebab
// RowActionMenu (sheet di mobile, dropdown di desktop) — satu sumber perilaku.

export type PrintMode = 'lengkap' | 'thermal' | 'thermer'

/** Cetak nota 3 mode (A5 / thermal preview / Thermer langsung) + ingat mode terakhir antar sesi. */
export function usePrintNota(pembelian: PembelianRow, nomorUrut: number) {
  const hydrated = useHydrated()
  const [storedLastMode, setLastMode] = useState<PrintMode | null>(() => {
    if (typeof window === 'undefined') return null
    const m = localStorage.getItem('last_print_mode')
    return m === 'lengkap' || m === 'thermal' || m === 'thermer' ? m : null
  })
  const lastMode = hydrated ? storedLastMode : null

  function remember(mode: PrintMode) {
    localStorage.setItem('last_print_mode', mode)
    setLastMode(mode)
  }

  function printLengkap() {
    remember('lengkap')
    const html = buildNotaHTML(pembelian, nomorUrut)
    const win = window.open('', '_blank', 'width=600,height=750')
    if (!win) { toast.error('Pop-up diblokir. Izinkan pop-up untuk halaman ini.'); return }
    win.document.open(); win.document.write(html); win.document.close()
  }

  function printThermal() {
    remember('thermal')
    const width = getThermalWidth()
    const html = buildThermalHTML(pembelian, width, nomorUrut)
    const win = window.open('', '_blank', `width=${width === 80 ? 400 : 320},height=600`)
    if (!win) { toast.error('Pop-up diblokir. Izinkan pop-up untuk halaman ini.'); return }
    win.document.open(); win.document.write(html); win.document.close()
  }

  function printThermer() {
    remember('thermer')
    const url = buildThermerURL(pembelian, nomorUrut)
    // Fallback: bila Thermer tak terpasang, iOS diam (tak ada error) → deteksi via
    // visibilitychange; kalau halaman tetap terlihat setelah jeda, app tak terbuka.
    let opened = false
    const onHide = () => { opened = true }
    document.addEventListener('visibilitychange', onHide, { once: true })
    window.location.href = url
    window.setTimeout(() => {
      document.removeEventListener('visibilitychange', onHide)
      if (!opened && document.visibilityState === 'visible') {
        toast.error('Tidak bisa membuka Thermer. Pastikan aplikasi Thermer terpasang.')
      }
    }, 1600)
  }

  return { lastMode, printLengkap, printThermal, printThermer }
}

/** Bagikan nota sebagai GAMBAR struk thermal (share sheet native iOS; fallback unduh PNG). */
export function useShareNota(pembelian: PembelianRow, nomorUrut: number) {
  const [busy, setBusy] = useState(false)
  async function share() {
    if (busy) return
    setBusy(true)
    try {
      const blob = await renderThermalNotaBlob(pembelian, nomorUrut)
      if (!blob) { toast.error('Gagal membuat gambar nota'); return }
      const slug = (pembelian.peron?.nama ?? 'ocm').replace(/\s+/g, '-').toLowerCase()
      const file = new File([blob], `nota-${slug}-${pembelian.tanggal}.png`, { type: 'image/png' })
      const nav = typeof navigator !== 'undefined' ? navigator : undefined
      if (nav?.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: `Nota Pembelian — ${pembelian.peron?.nama ?? 'CV OCM'}` })
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
          downloadBlob(blob, file.name)
          toast.success('Nota disimpan sebagai gambar')
        }
        return
      }
      // Tak bisa share file (sebagian desktop) → unduh gambar nota.
      downloadBlob(blob, file.name)
      toast.success('Nota disimpan sebagai gambar')
    } finally {
      setBusy(false)
    }
  }
  return { busy, share }
}

export function PrintRekapButton({ pembelianList }: { pembelianList: PembelianRow[] }) {
  function handlePrint() {
    const html = buildRekapHTML(pembelianList)
    const win = window.open('', '_blank', 'width=1000,height=750')
    if (!win) { toast.error('Pop-up diblokir. Izinkan pop-up untuk halaman ini.'); return }
    win.document.open(); win.document.write(html); win.document.close()
  }
  return (
    <Button variant="outline" size="sm" className="gap-2 border-stone-200 text-stone-700 hover:bg-stone-50" onClick={handlePrint} title="Cetak Rekap">
      <Printer className="h-4 w-4" />
      Cetak Rekap
    </Button>
  )
}
