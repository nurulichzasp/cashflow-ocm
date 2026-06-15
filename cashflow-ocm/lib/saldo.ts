// Aritmetika saldo kas MURNI (tanpa I/O / DB). SATU sumber rumus invariant:
//   saldo akun = saldoAwal + Σ(masuk) − Σ(keluar)  atas baris transaksi_kas.
// Audit 15 Jun 2026 mengonfirmasi saldo dihitung on-the-fly (akun_kas tak simpan
// saldo) dan tiap mutasi punya pembalik atomik — helper ini menetapkan rumusnya
// di satu tempat yang teruji, supaya tidak ada penjumlahan yang menyimpang.

export type ArahMutasi = 'masuk' | 'keluar'

/** Net mutasi (masuk = +, keluar = −) dari sekumpulan baris transaksi_kas. */
export function netMutasi(rows: { arah: ArahMutasi; jumlah: number }[]): number {
  return rows.reduce((s, r) => s + (r.arah === 'masuk' ? r.jumlah : -r.jumlah), 0)
}

/**
 * Saldo tiap akun = saldoAwal + net mutasinya. Mempertahankan field lain pada
 * objek akun (nama, tipe, dst). Baris dengan akunId yang tak ada di akunList
 * diabaikan.
 */
export function saldoPerAkun<T extends { id: string; saldoAwal: number }>(
  akunList: T[],
  rows: { akunId: string; arah: ArahMutasi; jumlah: number }[],
): (T & { saldo: number })[] {
  const net: Record<string, number> = {}
  for (const r of rows) {
    net[r.akunId] = (net[r.akunId] ?? 0) + (r.arah === 'masuk' ? r.jumlah : -r.jumlah)
  }
  return akunList.map((a) => ({ ...a, saldo: a.saldoAwal + (net[a.id] ?? 0) }))
}
