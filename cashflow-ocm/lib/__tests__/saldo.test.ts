import { describe, it, expect } from 'vitest'
import { netMutasi, saldoPerAkun } from '../saldo'

describe('netMutasi', () => {
  it('kosong → 0', () => {
    expect(netMutasi([])).toBe(0)
  })
  it('masuk positif, keluar negatif', () => {
    expect(
      netMutasi([
        { arah: 'masuk', jumlah: 100 },
        { arah: 'keluar', jumlah: 30 },
        { arah: 'masuk', jumlah: 5 },
      ]),
    ).toBe(75)
  })
  it('semua keluar → negatif', () => {
    expect(netMutasi([{ arah: 'keluar', jumlah: 200 }, { arah: 'keluar', jumlah: 50 }])).toBe(-250)
  })
})

describe('saldoPerAkun', () => {
  const akun = [
    { id: 'a', nama: 'CV OCM', tipe: 'bank', saldoAwal: 1_000_000 },
    { id: 'b', nama: 'Tunai', tipe: 'tunai', saldoAwal: 0 },
  ]

  it('saldo = saldoAwal + net mutasi per akun', () => {
    const out = saldoPerAkun(akun, [
      { akunId: 'a', arah: 'masuk', jumlah: 500_000 },
      { akunId: 'a', arah: 'keluar', jumlah: 200_000 },
      { akunId: 'b', arah: 'masuk', jumlah: 75_000 },
    ])
    expect(out.find((x) => x.id === 'a')!.saldo).toBe(1_300_000)
    expect(out.find((x) => x.id === 'b')!.saldo).toBe(75_000)
  })

  it('akun tanpa mutasi → saldoAwal', () => {
    const out = saldoPerAkun(akun, [])
    expect(out.map((x) => x.saldo)).toEqual([1_000_000, 0])
  })

  it('mempertahankan field lain & mengabaikan akunId tak dikenal', () => {
    const out = saldoPerAkun(akun, [{ akunId: 'zzz', arah: 'masuk', jumlah: 999 }])
    expect(out[0].nama).toBe('CV OCM')
    expect(out.find((x) => x.id === 'a')!.saldo).toBe(1_000_000) // mutasi 'zzz' diabaikan
  })

  it('total saldo = jumlah saldo semua akun', () => {
    const out = saldoPerAkun(akun, [{ akunId: 'a', arah: 'keluar', jumlah: 400_000 }])
    expect(out.reduce((s, x) => s + x.saldo, 0)).toBe(600_000)
  })
})
