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

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isExcel = file.type.includes('spreadsheet') || file.type.includes('excel') ||
      file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')
    const isImage = file.type.startsWith('image/')

    if (isImage) {
      // Foto: tidak bisa di-parse, kembalikan info minimal
      return NextResponse.json({ success: true, tanggal: '', noBast: '', noInvoice: '', totalTonase: '', totalNilai: '', info: 'foto' })
    }

    if (isExcel) {
      // Excel: coba extract dengan xlsx
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const XLSX = require('xlsx')
        const buffer = Buffer.from(await file.arrayBuffer())
        const wb = XLSX.read(buffer, { type: 'buffer' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const text = XLSX.utils.sheet_to_csv(ws)
        const result = extractBastFields(text)
        return NextResponse.json({ success: true, ...result, info: 'excel' })
      } catch {
        return NextResponse.json({ success: true, tanggal: '', noBast: '', noInvoice: '', totalTonase: '', totalNilai: '', info: 'excel-parse-failed' })
      }
    }

    if (isPdf) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const buffer = Buffer.from(await file.arrayBuffer())
      const parsed = await pdfParse(buffer)
      const text: string = parsed.text ?? ''
      const result = extractBastFields(text)
      return NextResponse.json({ success: true, ...result, info: 'pdf' })
    }

    return NextResponse.json({ error: 'Format tidak didukung. Gunakan PDF, Excel, atau foto.' }, { status: 400 })
  } catch (err) {
    console.error('[parse-bast]', err)
    return NextResponse.json({ error: 'Gagal membaca file: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

function extractBastFields(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim()

  // Tanggal
  let tanggal = ''
  const bulanMap: Record<string, string> = {
    januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
    juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12',
  }
  const tglLong = clean.match(/(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i)
  const tglSlash = clean.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  const tglIso = clean.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (tglLong) {
    const bln = bulanMap[tglLong[2].toLowerCase()]
    tanggal = `${tglLong[3]}-${bln}-${tglLong[1].padStart(2, '0')}`
  } else if (tglSlash) {
    tanggal = `${tglSlash[3]}-${tglSlash[2]}-${tglSlash[1]}`
  } else if (tglIso) {
    tanggal = tglIso[0]
  }

  // No. BAST
  let noBast = ''
  const bastMatch = clean.match(/(?:No\.?\s*BAST|BAST[\s:]*No\.?|Nomor\s+BAST)[:\s]*([A-Z0-9\/\-\.]+)/i)
  if (bastMatch) noBast = bastMatch[1].trim()

  // No. Invoice / Faktur
  let noInvoice = ''
  const invMatch = clean.match(/(?:No\.?\s*(?:Invoice|Faktur|INV|Nota)|Invoice\s+No\.?)[:\s]*([A-Z0-9\/\-\.]+)/i)
  if (invMatch) noInvoice = invMatch[1].trim()

  // Total tonase
  let totalTonase = ''
  const tonaseMatch = clean.match(/(?:Total\s+)?(?:Berat|Tonase|Timbangan|Netto|Neto|Kg)[:\s]*([\d.,]+)\s*(?:Kg|Ton|KG)/i)
  if (tonaseMatch) totalTonase = tonaseMatch[1].replace(/\./g, '').replace(',', '.')

  // Total nilai
  let totalNilai = ''
  const nilaiMatch = clean.match(/(?:Total\s+(?:Harga|Nilai|Pembayaran|Tagihan)|Jumlah\s+(?:Total|Bayar|Tagihan))[:\s]*(?:Rp\.?\s*)?([\d.,]+)/i)
  if (nilaiMatch) totalNilai = nilaiMatch[1].replace(/\./g, '').replace(',', '.')

  return { tanggal, noBast, noInvoice, totalTonase, totalNilai }
}
