export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import * as XLSX from 'xlsx'

type BgaMoneyValues = {
  total: number
  dpp: number
  ppn: number
  pph: number
  dibayar: number
}

type BgaPreviewRow = BgaMoneyValues & {
  noInv: string
  ket: string
  area: string
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

    const name = file.name.toLowerCase()
    const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf')
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls') || file.type.includes('spreadsheet') || file.type.includes('excel')
    const isImage = file.type.startsWith('image/')

    if (isImage) {
      return NextResponse.json({ success: true, tanggal: '', noBast: '', noInvoice: '', totalTonase: '', totalNilai: '', info: 'foto — tidak bisa di-parse otomatis, isi manual ya' })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    if (isExcel) {
      try {
        const wb = XLSX.read(buffer, { type: 'buffer' })

        // BGA: baca KEDUA rekap (REKAP = 1 harga, REKAP 2 HARGA = 2 harga) lalu
        // bandingkan per kategori. Wiring BGA tidak konsisten antar periode &
        // sebagian sheet berisi data basi, jadi kategori yang BEDA ditandai
        // "conflict" supaya user yang pilih angka yang benar di form.
        const parseRekapSheet = (name: string) => {
          if (!(wb.SheetNames as string[]).includes(name)) return null
          const r = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' }) as (string | number)[][]
          return parseBgaRekap(r)
        }
        const rkA = parseRekapSheet('REKAP')           // harga tunggal
        const rkB = parseRekapSheet('REKAP 2 HARGA')   // dua harga
        const primary = rkB ?? rkA
        if (primary) {
          const aRows = rkA?.previewRows ?? []
          const bRows = rkB?.previewRows ?? []
          const pick = (x: BgaPreviewRow | null) => x
            ? { total: x.total, dpp: x.dpp, ppn: x.ppn, pph: x.pph, dibayar: x.dibayar }
            : null
          const n = Math.max(aRows.length, bRows.length)
          const mergedRows: Array<{
            noInv: string
            ket: string
            area: string
            rekap: BgaMoneyValues | null
            rekap2: BgaMoneyValues | null
            conflict: boolean
          }> = []
          for (let i = 0; i < n; i++) {
            const a = aRows[i] ?? null
            const b = bRows[i] ?? null
            const base = b ?? a
            const conflict = !!(a && b && Math.round(Number(a.total)) !== Math.round(Number(b.total)))
            mergedRows.push({
              noInv: base?.noInv ?? '', ket: base?.ket ?? '', area: base?.area ?? '',
              rekap: pick(a), rekap2: pick(b), conflict,
            })
          }
          return NextResponse.json({
            success: true,
            info: 'excel-bga-rekap',
            sheetNames: wb.SheetNames as string[],
            tanggal: primary.tanggal,
            noInvoice: primary.noInvoice,
            periode: primary.periode ?? '',
            mergedRows,
            hasRekap: !!rkA,
            hasRekap2: !!rkB,
          })
        }

        // Fallback: sheet pertama
        const ws = wb.Sheets[wb.SheetNames[0]]
        const text = (XLSX.utils.sheet_to_csv(ws) as string)
        const result = extractBastFields(text)
        return NextResponse.json({ success: true, ...result, info: 'excel' })
      } catch (e) {
        console.error('[parse-bast:excel]', e)
        return NextResponse.json({ success: true, tanggal: '', noBast: '', noInvoice: '', totalTonase: '', totalNilai: '', info: 'excel-parse-gagal' })
      }
    }

    if (isPdf) {
      const text = extractRawPdfText(buffer)
      const result = extractBastFields(text)
      return NextResponse.json({ success: true, ...result, info: 'pdf' })
    }

    return NextResponse.json({ error: 'Format tidak didukung. Gunakan PDF, Excel (.xlsx), atau foto.' }, { status: 400 })
  } catch (err) {
    console.error('[parse-bast]', err)
    return NextResponse.json({ error: 'Gagal membaca file: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

// ── BGA REKAP sheet parser ────────────────────────────────────────────────────
function parseBgaRekap(rows: (string | number)[][]): {
  tanggal: string; noInvoice: string; noBast: string; periode: string
  totalTonase: string; totalBersih: string; totalNilai: string; catatan: string
  previewRows: BgaPreviewRow[]; totalRow: BgaMoneyValues;
} | null {
  if (!rows || rows.length < 5) return null

  const titleRow = String(rows[0]?.[0] ?? '').toUpperCase()
  if (!titleRow.includes('REKAPAN') && !titleRow.includes('INVOICE CV')) return null

  const bulanMap: Record<string, string> = {
    januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
    juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12',
  }

  // Tanggal dari baris "Tanggal : DD Bulan YYYY"
  let tanggal = ''
  for (let i = 0; i <= 3; i++) {
    const tglStr = String(rows[i]?.[0] ?? '')
    const m = tglStr.match(/(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i)
    if (m) { tanggal = `${m[3]}-${bulanMap[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`; break }
  }

  // Cari header row (baris dengan "No Invoice" di kolom 0)
  const headerIdx = rows.findIndex(r => String(r[0]).trim() === 'No Invoice' || String(r[0]).trim() === 'No. Invoice')
  const dataStart = headerIdx >= 0 ? headerIdx + 1 : 3

  const seenInvoices = new Set<string>()
  const invoiceList: string[] = []
  const detailLines: string[] = []
  let periode = ''
  let totTotal = 0, totDpp = 0, totPpn = 0, totPph = 0, totDibayar = 0
  const previewRows: BgaPreviewRow[] = []

  for (const row of rows.slice(dataStart)) {
    const col0 = String(row[0] ?? '').trim()
    const keterangan = String(row[1] ?? '').trim()
    const area = String(row[2] ?? '').trim()
    const periodeStr = String(row[3] ?? '').trim()
    const totalVal = Number(row[4]) || 0
    const dppVal = Number(row[5]) || 0
    const ppnVal = Number(row[6]) || 0
    const pphVal = Number(row[7]) || 0
    const dibayarVal = Number(row[8]) || 0

    // Total row
    if (col0.toLowerCase() === 'total') {
      totTotal = totalVal; totDpp = dppVal; totPpn = ppnVal; totPph = pphVal; totDibayar = dibayarVal
      continue
    }

    // Skip baris kosong
    if (!col0 || !keterangan) continue

    // Ambil periode (strip teks panjang)
    if (!periode && periodeStr.includes('Periode')) {
      periode = periodeStr.replace(/\s+dengan\s+perincian.*/i, '').trim()
    }

    // Kumpulkan invoice unik (strip "No. " prefix)
    const noInv = col0.replace(/^No\.\s+/i, '').trim()
    if (noInv && !seenInvoices.has(noInv)) {
      seenInvoices.add(noInv)
      invoiceList.push(noInv)
    }

    // Preview row (semua baris, termasuk yang 0)
    previewRows.push({
      noInv,
      ket: shortKeterangan(keterangan),
      area: area.replace(/[()]/g, '').trim(),
      total: totalVal, dpp: dppVal, ppn: ppnVal, pph: pphVal, dibayar: dibayarVal,
    })

    // Baris detail — hanya yang ada nilainya
    if (dibayarVal > 0 || totalVal > 0) {
      const areaClean = area.replace(/[()]/g, '').trim()
      const label = shortKeterangan(keterangan)
      detailLines.push(`${label} (${areaClean}): Rp ${rpFormat(dibayarVal)}`)
    }
  }

  if (invoiceList.length === 0) return null

  // Tanggal transaksi = AKHIR periode (tgl "sampai" / s-d), bukan tanggal header invoice.
  if (periode) {
    const bulanRe = '(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)'
    const range = periode.match(new RegExp(`(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\s+${bulanRe}\\s+(\\d{4})`, 'i'))
    const single = periode.match(new RegExp(`(\\d{1,2})\\s+${bulanRe}\\s+(\\d{4})`, 'i'))
    if (range) tanggal = `${range[4]}-${bulanMap[range[3].toLowerCase()]}-${range[2].padStart(2, '0')}`
    else if (single) tanggal = `${single[3]}-${bulanMap[single[2].toLowerCase()]}-${single[1].padStart(2, '0')}`
  }

  // Susun catatan
  const lines: string[] = []
  if (periode) lines.push(periode)
  lines.push(...detailLines)
  if (totDibayar > 0 || totTotal > 0) {
    lines.push(`Total: ${rpFormat(totTotal)} | DPP: ${rpFormat(totDpp)} | PPN: ${rpFormat(totPpn)} | PPH: ${rpFormat(totPph)}`)
    lines.push(`Total Dibayar: Rp ${rpFormat(totDibayar)}`)
  }

  return {
    tanggal,
    noInvoice: invoiceList.join('\n'),
    noBast: '',
    periode,
    totalTonase: '',
    totalBersih: String(Math.round(totTotal)),
    totalNilai: String(Math.round(totDibayar)),
    catatan: lines.join('\n'),
    previewRows,
    totalRow: { total: totTotal, dpp: totDpp, ppn: totPpn, pph: totPph, dibayar: totDibayar },
  }
}

function shortKeterangan(k: string): string {
  const afterMandiri = k.match(/MANDIRI\s*(.*)/i)?.[1]?.trim() ?? ''
  const produk = /\bBRONDOLAN\b/i.test(k) ? 'BRDL' : /\bTBS\b/i.test(k) ? 'TBS' : k.split(' ')[0].toUpperCase()
  const suffix = afterMandiri.replace(/^[-\s]+/, '').trim()
  return suffix ? `${produk} ${suffix}` : produk
}

function rpFormat(n: number): string {
  return Math.round(n).toLocaleString('id-ID')
}

// ── Raw PDF text extractor (no DOM deps) ──────────────────────────────────────
function extractRawPdfText(buffer: Buffer): string {
  const str = buffer.toString('binary')
  const texts: string[] = []

  function decodeOctal(s: string): string {
    return s.replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ')
      .replace(/\\\\/g, '\\').replace(/\\\(/g, '(').replace(/\\\)/g, ')')
  }

  const btEt = /BT([\s\S]{0,2000}?)ET/g
  let m: RegExpExecArray | null
  while ((m = btEt.exec(str)) !== null) {
    const block = m[1]
    const tj = /\(([^)]{1,200})\)\s*Tj/g
    let t: RegExpExecArray | null
    while ((t = tj.exec(block)) !== null) {
      const decoded = decodeOctal(t[1]).trim()
      if (decoded.length > 1) texts.push(decoded)
    }
    const tjArr = /\[([^\]]{1,500})\]\s*TJ/g
    while ((t = tjArr.exec(block)) !== null) {
      const inner = t[1]
      const parts = /\(([^)]{1,200})\)/g
      let p: RegExpExecArray | null
      while ((p = parts.exec(inner)) !== null) {
        const decoded = decodeOctal(p[1]).trim()
        if (decoded.length > 1) texts.push(decoded)
      }
    }
  }

  if (texts.length < 5) {
    const fallback = /\(([A-Za-z0-9 \.\-\/\:,_]{3,100})\)/g
    while ((m = fallback.exec(str)) !== null) {
      const s = m[1].trim()
      if (s.length >= 3 && !texts.includes(s)) texts.push(s)
    }
  }

  return texts.join(' ')
}

// ── Field extractor (PDF / Excel non-REKAP) ───────────────────────────────────
function extractBastFields(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim()

  const bulanMap: Record<string, string> = {
    januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
    juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12',
  }

  // === Tanggal ===
  let tanggal = ''
  // BGA: "Periode 03-04 Juni 2026" → ambil tanggal akhir
  const tglPeriode = clean.match(/Periode\s+\d{1,2}-(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i)
  const tglLong = clean.match(/(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i)
  const tglSlash = clean.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  const tglIso = clean.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (tglPeriode) {
    tanggal = `${tglPeriode[3]}-${bulanMap[tglPeriode[2].toLowerCase()]}-${tglPeriode[1].padStart(2, '0')}`
  } else if (tglLong) {
    tanggal = `${tglLong[3]}-${bulanMap[tglLong[2].toLowerCase()]}-${tglLong[1].padStart(2, '0')}`
  } else if (tglSlash) {
    tanggal = `${tglSlash[3]}-${tglSlash[2]}-${tglSlash[1]}`
  } else if (tglIso) {
    tanggal = tglIso[0]
  }

  // === No. BAST ===
  let noBast = ''
  const bastMatch = clean.match(/(?:No\.?\s*BAST|BAST[\s:]*No\.?|Nomor\s+BAST)[:\s]*([A-Z0-9\/\-\.]+)/i)
  if (bastMatch) noBast = bastMatch[1].trim()

  // === No. Invoice ===
  let noInvoice = ''
  // BGA format: "No. 001/INV-TBS/CV.OCM/VI/2026"
  const invBga = clean.match(/No\.\s+(\d{3}\/INV[-a-zA-Z0-9\/\.]+)/i)
  const invStd = clean.match(/(?:No\.?\s*(?:Invoice|Faktur|INV|Nota)|Invoice\s+No\.?)[:\s]*([A-Z0-9\/\-\.]+)/i)
  if (invBga) noInvoice = invBga[1].trim()
  else if (invStd) noInvoice = invStd[1].trim()

  // === Total Tonase ===
  let totalTonase = ''
  const tonaseMatch = clean.match(/(?:Total\s+)?(?:Berat|Tonase|Timbangan|Netto|Neto)[:\s]*([\d.,]+)\s*(?:Kg|Ton|KG)/i)
  if (tonaseMatch) totalTonase = tonaseMatch[1].replace(/\./g, '').replace(',', '.')

  // === Total Nilai ===
  let totalNilai = ''
  // BGA format: baris Total di CSV → 5 angka, terakhir = Total dibayar
  const bgaTotalRow = clean.match(/\bTotal\b[,\s]*([\d.]+)[,\s]*([\d.]+)[,\s]*([\d.]+)[,\s]*([\d.]+)[,\s]*([\d.]+)/i)
  if (bgaTotalRow) {
    totalNilai = bgaTotalRow[5].replace(/\./g, '').replace(',', '.')
  } else {
    const nilaiMatch = clean.match(/(?:Total\s+(?:Harga|Nilai|Pembayaran|Tagihan|[Dd]ibayar)|Jumlah\s+(?:Total|Bayar|Tagihan))[:\s,]*(?:Rp\.?\s*)?([\d.,]+)/i)
    if (nilaiMatch) totalNilai = nilaiMatch[1].replace(/\./g, '').replace(',', '.')
  }

  return { tanggal, noBast, noInvoice, totalTonase, totalNilai }
}
