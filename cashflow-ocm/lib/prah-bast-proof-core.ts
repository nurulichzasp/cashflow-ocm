import { createHmac, timingSafeEqual } from 'node:crypto'
import type { PrahBastRow } from './bast-prah'
import { normalizeBastNumber } from './bast-prah'

export type PrahProofRow = Pick<PrahBastRow, 'tanggal' | 'truk' | 'noTid' | 'tonaseKotor' | 'tonaseNetto1'>

function payload(noBast: string, rows: PrahProofRow[]): string {
  return JSON.stringify({
    noBast: normalizeBastNumber(noBast),
    rows: rows.map((row) => ({
      tanggal: row.tanggal,
      truk: row.truk,
      noTid: row.noTid.trim().toUpperCase(),
      tonaseKotor: row.tonaseKotor,
      tonaseNetto1: row.tonaseNetto1,
    })),
  })
}

export function signPrahBastPayload(noBast: string, rows: PrahProofRow[], secret: string): string {
  // Baris kosong tetap ditandatangani: ini membuktikan BAST sudah melewati parser
  // dan memang tidak menemukan Doni/Katimin, bukan sekadar dilewati dari form.
  if (!noBast.trim()) return ''
  return createHmac('sha256', secret).update(payload(noBast, rows)).digest('hex')
}

export function verifyPrahBastPayload(noBast: string, rows: PrahProofRow[], proof: string, secret: string): boolean {
  if (!proof || !noBast.trim()) return false
  const expected = signPrahBastPayload(noBast, rows, secret)
  const actualBuffer = Buffer.from(proof)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}
