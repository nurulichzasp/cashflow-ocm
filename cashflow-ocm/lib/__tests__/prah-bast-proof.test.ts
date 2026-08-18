import { describe, expect, it } from 'vitest'
import { signPrahBastPayload, verifyPrahBastPayload } from '../prah-bast-proof-core'

const secret = 'test-only-prah-proof-secret'
const rows = [{
  tanggal: '2026-08-15',
  truk: 'katimin' as const,
  noTid: 'GR0600000001',
  tonaseKotor: 14250,
  tonaseNetto1: 10100,
}]

describe('bukti parser Prah', () => {
  it('menerima payload asli dan normalisasi nomor BAST yang setara', () => {
    const proof = signPrahBastPayload(' bast  01/ocm ', rows, secret)
    expect(verifyPrahBastPayload('BAST 01/OCM', rows, proof, secret)).toBe(true)
  })

  it('menolak perubahan tonase, TID, nomor BAST, dan secret', () => {
    const proof = signPrahBastPayload('BAST 01/OCM', rows, secret)
    expect(verifyPrahBastPayload('BAST 01/OCM', [{ ...rows[0], tonaseKotor: 15000 }], proof, secret)).toBe(false)
    expect(verifyPrahBastPayload('BAST 01/OCM', [{ ...rows[0], noTid: 'GR0600000002' }], proof, secret)).toBe(false)
    expect(verifyPrahBastPayload('BAST 02/OCM', rows, proof, secret)).toBe(false)
    expect(verifyPrahBastPayload('BAST 01/OCM', rows, proof, 'different-secret')).toBe(false)
  })

  it('menandatangani hasil parser kosong agar BAST tidak dapat dilewati staf', () => {
    const proof = signPrahBastPayload('BAST TANPA PRAH', [], secret)
    expect(proof).not.toBe('')
    expect(verifyPrahBastPayload('BAST TANPA PRAH', [], proof, secret)).toBe(true)
    expect(verifyPrahBastPayload('BAST LAIN', [], proof, secret)).toBe(false)
  })
})
