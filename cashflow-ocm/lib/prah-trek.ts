export const PRAH_TARIF_PER_KG = 140
export const PRAH_BIAYA_SOPIR = 200_000
export const PRAH_MAX_TONASE_KG = 100_000

export const PRAH_TRUK = ['katimin', 'doni'] as const
export type PrahTruk = (typeof PRAH_TRUK)[number]

export const PRAH_TRUK_LABEL: Record<PrahTruk, string> = {
  katimin: 'Katimin',
  doni: 'Doni',
}

export function hitungPendapatanPrah(tonaseKotorKg: number, tarifPerKg = PRAH_TARIF_PER_KG): number {
  return Math.round(tonaseKotorKg * tarifPerKg)
}

export function hitungKeuntunganPrah(input: {
  pendapatan: number
  biayaSopir: number
  biayaBbm: number
}): number {
  return input.pendapatan - input.biayaSopir - input.biayaBbm
}
