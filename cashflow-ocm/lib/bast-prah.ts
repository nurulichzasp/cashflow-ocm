import { PRAH_MAX_TONASE_KG, type PrahTruk } from './prah-trek'

export type PrahBastRow = {
  key: string
  tanggal: string
  truk: PrahTruk
  noTid: string
  tonaseKotor: number
  tonaseNetto1: number
}

function parseWeight(raw: string): number {
  const compact = raw.replace(/\s/g, '')
  // Dokumen Indonesia lazim memakai titik/koma sebagai pemisah ribuan untuk kg.
  return Number(compact.replace(/[.,]/g, '')) || 0
}

function weightTokens(text: string): number[] {
  const matches = text.match(/\b(?:\d{1,3}(?:[.,]\s?\d{3})+|\d{4,6})\b/g) ?? []
  return matches.map(parseWeight).filter((value) => value >= 1_000 && value <= PRAH_MAX_TONASE_KG)
}

function parseDate(text: string): string {
  const iso = text.match(/\b(20\d{2})[-/]([01]?\d)[-/]([0-3]?\d)\b/)
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  const id = text.match(/\b([0-3]?\d)[-/]([01]?\d)[-/](20\d{2})\b/)
  if (id) return `${id[3]}-${id[2].padStart(2, '0')}-${id[1].padStart(2, '0')}`
  return ''
}

function findWeights(segment: string): { gross: number; netto1: number; confidence: 'labeled' | 'triplet' } | null {
  const grossLabel = segment.match(/(?:berat\s*)?(?:kotor|gross|bruto)\s*[:=]?\s*(\d{1,3}(?:[.,]\s?\d{3})+|\d{4,6})/i)
  const nettoLabel = segment.match(/(?:netto|neto)\s*1?\s*[:=]?\s*(\d{1,3}(?:[.,]\s?\d{3})+|\d{4,6})/i)
  if (grossLabel && nettoLabel) {
    const gross = parseWeight(grossLabel[1])
    const netto1 = parseWeight(nettoLabel[1])
    if (gross > 0 && gross <= PRAH_MAX_TONASE_KG && netto1 > 0 && gross >= netto1) {
      return { gross, netto1, confidence: 'labeled' }
    }
  }

  const tokens = weightTokens(segment)
  // Format tabel paling umum: Kotor, Tara, Netto 1. Pilih triplet yang memenuhi
  // persamaan timbangan paling dekat, bukan sekadar dua angka terbesar.
  let best: { gross: number; netto1: number; error: number } | null = null
  for (let index = 0; index <= tokens.length - 3; index++) {
    const [gross, tare, netto1] = tokens.slice(index, index + 3)
    if (gross <= netto1 || tare <= 0 || tare >= gross) continue
    const error = Math.abs(gross - tare - netto1)
    const tolerance = Math.max(100, gross * 0.03)
    if (error <= tolerance && (!best || error < best.error)) best = { gross, netto1, error }
  }
  if (best) return { gross: best.gross, netto1: best.netto1, confidence: 'triplet' }
  return null
}

const DRIVER_PATTERN_SOURCE = '\\b(KATIMIN|DONI|DODI)\\b'
const TID_PATTERN_SOURCE = '\\bGR\\d{6,}\\b'

function driverMatches(text: string) {
  return Array.from(text.matchAll(new RegExp(DRIVER_PATTERN_SOURCE, 'gi')))
}

function extractCandidate(segment: string, offset: number, forcedTid = '', forcedDate = ''): { offset: number; row: PrahBastRow } | null {
  const drivers = driverMatches(segment)
  // Satu record fisik hanya boleh menunjuk satu sopir. Ini mencegah judul seperti
  // "Daftar Katimin dan Doni" dianggap sebagai perjalanan.
  if (drivers.length !== 1) return null

  const weights = findWeights(segment)
  if (!weights) return null
  const tanggal = forcedDate || parseDate(segment)
  // Tanpa TID, triplet angka tanpa tanggal terlalu mudah tertukar dengan total
  // keuangan. Format berlabel eksplisit tetap boleh tanpa tanggal dan akan meminta
  // tanggal default di UI.
  if (!forcedTid && weights.confidence === 'triplet' && !tanggal) return null

  const truk: PrahTruk = drivers[0][1].toUpperCase() === 'KATIMIN' ? 'katimin' : 'doni'
  const noTid = (forcedTid || segment.match(new RegExp(TID_PATTERN_SOURCE, 'i'))?.[0] || '').toUpperCase()
  const fingerprint = `${truk}:${noTid || '-'}:${tanggal || '-'}:${weights.gross}:${weights.netto1}`
  return {
    offset,
    row: {
      key: noTid || `${fingerprint}:${offset}`,
      tanggal,
      truk,
      noTid,
      tonaseKotor: weights.gross,
      tonaseNetto1: weights.netto1,
    },
  }
}

/**
 * Ambil hanya perjalanan Doni/Dodi dan Katimin dari teks BAST. Parser menerima
 * format berlabel maupun tabel Kotor–Tara–Netto 1. Hasil tetap ditampilkan di UI
 * untuk verifikasi manusia sebelum disimpan.
 */
export function extractPrahBastRows(text: string): PrahBastRow[] {
  const normalized = text.replace(/\r\n?/g, '\n')
  const tids = Array.from(normalized.matchAll(new RegExp(TID_PATTERN_SOURCE, 'gi')))
  const candidates: Array<{ offset: number; row: PrahBastRow }> = []

  // Gunakan baris sopir sebagai pasangan TID, bukan menganggap TID selalu menjadi
  // kolom pertama. Batas berikutnya adalah TID atau sopir record selanjutnya.
  // Dengan begitu metadata di kiri/atas TID tetap terbaca, tanpa menarik berat
  // dari perjalanan tetangga.
  if (tids.length > 0) {
    const lines = normalized.split('\n')
    const lineOffsets: number[] = []
    let cursor = 0
    for (const line of lines) {
      lineOffsets.push(cursor)
      cursor += line.length + 1
    }
    const lineAtOffset = (offset: number) => {
      let low = 0
      let high = lineOffsets.length - 1
      while (low < high) {
        const middle = Math.ceil((low + high) / 2)
        if (lineOffsets[middle] <= offset) low = middle
        else high = middle - 1
      }
      return low
    }
    const tidLines = tids.map((tid) => lineAtOffset(tid.index ?? 0))
    const driverLines = lines.flatMap((line, index) => driverMatches(line).length === 1 ? [index] : [])

    tids.forEach((tid, index) => {
      const tidLine = tidLines[index]
      const previousTidLine = tidLines[index - 1]
      const nextTidLine = tidLines[index + 1]
      const nearbyDrivers = driverLines.filter((line) =>
        line > (previousTidLine ?? -1) && line < (nextTidLine ?? lines.length),
      )
      const driverLine = nearbyDrivers.sort((a, b) => Math.abs(a - tidLine) - Math.abs(b - tidLine))[0]
      if (driverLine === undefined) return

      const nextDriverLine = driverLines.find((line) => line > driverLine)
      const startLine = Math.min(tidLine, driverLine)
      const endLine = Math.min(nextTidLine ?? lines.length, nextDriverLine ?? lines.length)
      const segment = lines.slice(startLine, endLine).join('\n')

      // Tanggal dapat berada satu/beberapa baris sebelum sopir dan TID. Pilih
      // tanggal yang paling dekat dengan anchor record, bukan tanggal pertama di
      // seluruh blok yang mungkin sudah milik perjalanan berikutnya.
      const anchorStart = Math.min(tidLine, driverLine)
      const anchorEnd = Math.max(tidLine, driverLine)
      const dateStartLine = previousTidLine === undefined ? Math.max(0, startLine - 5) : previousTidLine + 1
      const dateCandidates = lines.slice(dateStartLine, endLine).flatMap((line, relativeIndex) => {
        const tanggal = parseDate(line)
        if (!tanggal) return []
        const lineIndex = dateStartLine + relativeIndex
        const distance = lineIndex < anchorStart
          ? anchorStart - lineIndex
          : lineIndex > anchorEnd
            ? lineIndex - anchorEnd
            : 0
        return [{ tanggal, lineIndex, distance }]
      }).sort((a, b) => a.distance - b.distance || Math.abs(a.lineIndex - tidLine) - Math.abs(b.lineIndex - tidLine))

      const candidate = extractCandidate(segment, lineOffsets[startLine], tid[0], dateCandidates[0]?.tanggal)
      if (candidate) candidates.push(candidate)
    })
  }

  // Dokumen tanpa TID masih didukung, tetapi hanya bila tidak ada TID sama sekali.
  // Jendela dibatasi oleh baris sopir agar angka perjalanan lain tidak ikut terbaca.
  if (tids.length === 0) {
    const lines = normalized.split('\n')
    const lineOffsets: number[] = []
    let cursor = 0
    for (const line of lines) {
      lineOffsets.push(cursor)
      cursor += line.length + 1
    }
    const driverLineIndexes = lines.flatMap((line, index) => driverMatches(line).length ? [index] : [])
    driverLineIndexes.forEach((lineIndex, driverIndex) => {
      if (driverMatches(lines[lineIndex]).length !== 1) return
      const previousDriverLine = driverLineIndexes[driverIndex - 1]
      const nextDriverLine = driverLineIndexes[driverIndex + 1]
      const startLine = Math.max(previousDriverLine === undefined ? 0 : previousDriverLine + 1, lineIndex - 5)
      const endLine = Math.min(nextDriverLine ?? lines.length, lineIndex + 6)
      const segment = lines.slice(startLine, endLine).join('\n')
      if (driverMatches(segment).length !== 1) return
      const candidate = extractCandidate(segment, lineOffsets[startLine])
      if (candidate) candidates.push(candidate)
    })
  }

  candidates.sort((a, b) => a.offset - b.offset)
  const result: PrahBastRow[] = []
  const seen = new Set<string>()
  const seenTids = new Map<string, string>()
  for (const { row } of candidates) {
    const fingerprint = `${row.truk}:${row.noTid || '-'}:${row.tanggal || '-'}:${row.tonaseKotor}:${row.tonaseNetto1}`
    const normalizedTid = row.noTid.trim().toUpperCase()
    if (normalizedTid) {
      const previous = seenTids.get(normalizedTid)
      if (previous && previous !== fingerprint) {
        throw new Error(`TID ${normalizedTid} muncul lebih dari sekali dengan data berbeda`)
      }
      if (previous) continue
      seenTids.set(normalizedTid, fingerprint)
    }
    if (seen.has(fingerprint)) continue
    seen.add(fingerprint)
    result.push(row)
  }
  return result
}

export function normalizeBastNumber(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase()
}

/** Kunci stabil lintas input Penjualan dan input cadangan Prah Trek. */
export function buildPrahBastSourceKeys(rows: Omit<PrahBastRow, 'key'>[]): string[] {
  assertUniquePrahBastTids(rows)
  const occurrences = new Map<string, number>()
  return rows.map((row) => {
    const normalizedTid = row.noTid.trim().toUpperCase()
    const base = normalizedTid || [
      row.tanggal,
      row.truk,
      row.tonaseKotor,
      row.tonaseNetto1,
    ].join(':')
    // Salinan identik dengan TID yang sama memakai source key yang sama sehingga
    // unique index DB menyimpannya tepat satu kali.
    if (normalizedTid) return base
    const occurrence = occurrences.get(base) ?? 0
    occurrences.set(base, occurrence + 1)
    return occurrence === 0 ? base : `${base}:${occurrence + 1}`
  })
}

/** Tolak satu TID yang menunjuk dua perjalanan berbeda sebelum query INSERT dibuat. */
export function assertUniquePrahBastTids(rows: Omit<PrahBastRow, 'key'>[]): void {
  const seen = new Map<string, string>()
  for (const row of rows) {
    const noTid = row.noTid.trim().toUpperCase()
    if (!noTid) continue
    const fingerprint = `${row.tanggal}:${row.truk}:${row.tonaseKotor}:${row.tonaseNetto1}`
    const previous = seen.get(noTid)
    if (previous && previous !== fingerprint) {
      throw new Error(`TID ${noTid} muncul lebih dari sekali dengan data berbeda`)
    }
    seen.set(noTid, fingerprint)
  }
}
