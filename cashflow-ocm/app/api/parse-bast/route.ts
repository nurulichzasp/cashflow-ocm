import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse')

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    if (!file.type.includes('pdf')) return NextResponse.json({ error: 'Hanya file PDF yang didukung' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await pdfParse(buffer)
    const text: string = parsed.text ?? ''

    // Ekstrak field dari teks PDF BGA
    const result = extractBastFields(text)
    return NextResponse.json({ success: true, ...result, rawText: text.slice(0, 2000) })
  } catch (err) {
    console.error('[parse-bast]', err)
    return NextResponse.json({ error: 'Gagal membaca PDF' }, { status: 500 })
  }
}

function extractBastFields(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim()

  // Tanggal — cari pola DD/MM/YYYY atau YYYY-MM-DD atau "05 Juni 2026"
  let tanggal = ''
  const tglMatch =
    clean.match(/(\d{2})\/(\d{2})\/(\d{4})/) ||
    clean.match(/(\d{4})-(\d{2})-(\d{2})/) ||
    clean.match(/(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i)

  if (tglMatch) {
    const bulanMap: Record<string, string> = {
      januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
      juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12',
    }
    if (tglMatch[0].includes('/')) {
      tanggal = `${tglMatch[3]}-${tglMatch[2]}-${tglMatch[1]}`
    } else if (tglMatch[0].match(/\d{4}-\d{2}-\d{2}/)) {
      tanggal = tglMatch[0]
    } else {
      const bln = bulanMap[tglMatch[2].toLowerCase()]
      tanggal = `${tglMatch[3]}-${bln}-${tglMatch[1].padStart(2, '0')}`
    }
  }

  // No. BAST
  let noBast = ''
  const bastMatch = clean.match(/(?:No\.?\s*BAST|BAST[\s:]*No\.?|Nomor\s+BAST)[:\s]*([A-Z0-9\/\-\.]+)/i)
  if (bastMatch) noBast = bastMatch[1].trim()

  // No. Invoice / Faktur
  let noInvoice = ''
  const invMatch = clean.match(/(?:No\.?\s*(?:Invoice|Faktur|INV)|Invoice\s+No\.?)[:\s]*([A-Z0-9\/\-\.]+)/i)
  if (invMatch) noInvoice = invMatch[1].trim()

  // Total tonase (kg)
  let totalTonase = ''
  const tonaseMatch = clean.match(/(?:Total\s+)?(?:Berat|Tonase|Timbangan|Netto)[:\s]*([\d.,]+)\s*(?:Kg|Ton)/i)
  if (tonaseMatch) totalTonase = tonaseMatch[1].replace(/\./g, '').replace(',', '.')

  // Total nilai / harga
  let totalNilai = ''
  const nilaiMatch = clean.match(/(?:Total\s+(?:Harga|Nilai|Pembayaran)|Jumlah\s+(?:Total|Bayar))[:\s]*Rp\.?\s*([\d.,]+)/i)
  if (nilaiMatch) totalNilai = nilaiMatch[1].replace(/\./g, '').replace(',', '.')

  return { tanggal, noBast, noInvoice, totalTonase, totalNilai }
}
