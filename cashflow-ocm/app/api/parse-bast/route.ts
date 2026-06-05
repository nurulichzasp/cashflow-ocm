export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

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
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const XLSX = require('xlsx')
        const wb = XLSX.read(buffer, { type: 'buffer' })
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
      // Raw PDF text extraction — tanpa library DOM-dependent
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

// ── Raw PDF text extractor (no DOM deps) ──────────────────────────────────────
function extractRawPdfText(buffer: Buffer): string {
  const str = buffer.toString('binary')
  const texts: string[] = []

  // Decode octal escape sequences in PDF strings
  function decodeOctal(s: string): string {
    return s.replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ')
      .replace(/\\\\/g, '\\').replace(/\\\(/g, '(').replace(/\\\)/g, ')')
  }

  // Method 1: extract from BT...ET text blocks
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
    // TJ array format: [(text)(more)] TJ
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

  // Method 2: fallback — any printable string in parentheses (catches more formats)
  if (texts.length < 5) {
    const fallback = /\(([A-Za-z0-9 \.\-\/\:,_]{3,100})\)/g
    while ((m = fallback.exec(str)) !== null) {
      const s = m[1].trim()
      if (s.length >= 3 && !texts.includes(s)) texts.push(s)
    }
  }

  return texts.join(' ')
}

// ── Field extractor ───────────────────────────────────────────────────────────
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
  // BGA format: baris Total di Excel → 5 angka setelah "Total", angka ke-5 = Total dibayar
  // Contoh CSV: ,Total,,,1124013150,1030345388,123641447,2810033,1244844564
  const bgaTotalRow = clean.match(/\bTotal\b[,\s]*([\d.]+)[,\s]*([\d.]+)[,\s]*([\d.]+)[,\s]*([\d.]+)[,\s]*([\d.]+)/i)
  if (bgaTotalRow) {
    totalNilai = bgaTotalRow[5].replace(/\./g, '').replace(',', '.')
  } else {
    const nilaiMatch = clean.match(/(?:Total\s+(?:Harga|Nilai|Pembayaran|Tagihan|[Dd]ibayar)|Jumlah\s+(?:Total|Bayar|Tagihan))[:\s,]*(?:Rp\.?\s*)?([\d.,]+)/i)
    if (nilaiMatch) totalNilai = nilaiMatch[1].replace(/\./g, '').replace(',', '.')
  }

  return { tanggal, noBast, noInvoice, totalTonase, totalNilai }
}
