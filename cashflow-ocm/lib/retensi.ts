/**
 * Model ekonomi Retensi Peron — kalkulator pertahanan harga.
 *
 * OCM = broker spread. Saat kompetitor menawar peron lebih tinggi, strateginya
 * BUKAN menyamai harga (buang margin), melainkan menutup selisih sampai di bawah
 * ambang loyalitas (~20 Rp/kg) — cukup supaya peron tak pindah karena inersia.
 * Penyesuaian senyap & per-peron lewat `keuntunganPerKg` (untung CV).
 *
 * SEMUA konstanta margin di-derive dari {@link ./harga} — TIDAK ada 120/50/70
 * hardcoded di sini. Ini modul MURNI (aman diimpor di client) & TIDAK men-clamp
 * ulang cap: selalu lewat effectiveKelebihanPeron / effectiveKeuntunganPerKg.
 */
import {
  SELISIH_JUAL_BGA,
  CAP_KEUNTUNGAN_PERON,
  isProdukTBS,
  effectiveKelebihanPeron,
  effectiveKeuntunganPerKg,
} from './harga'

/** Ambang loyalitas default (Rp/kg). Override via app_settings retention_loyalty_threshold. */
export const RETENSI_DEFAULT_AMBANG = 20
/** Floor untung CV TBS default (Rp/kg). Override via app_settings retention_min_margin_tbs. */
export const RETENSI_DEFAULT_MIN_MARGIN_TBS = 40

export interface RetensiSettings {
  /** Ambang loyalitas Rp/kg — gap ≤ ini dianggap AMAN. */
  ambang: number
  /** Batas bawah untung CV TBS (brondolan ter-floor otomatis via cap). */
  minMarginTbs: number
}

export const RETENSI_DEFAULTS: RetensiSettings = {
  ambang: RETENSI_DEFAULT_AMBANG,
  minMarginTbs: RETENSI_DEFAULT_MIN_MARGIN_TBS,
}

/**
 * Floor untung CV per produk = batas bawah penyesuaian senyap.
 *   Brondolan: SELISIH − CAP (mis. 120−50 = 70) — di-derive, tak ditulis 70.
 *   TBS:       minMarginTbs (default 40).
 */
export function floorUntungCV(isTBS: boolean, minMarginTbs: number = RETENSI_DEFAULT_MIN_MARGIN_TBS): number {
  return isTBS ? minMarginTbs : SELISIH_JUAL_BGA - CAP_KEUNTUNGAN_PERON
}

/** Harga OCM ke peron (per produk) untuk untung CV = K. */
export function hargaOCMPeron(acuan: number, K: number, isTBS: boolean): number {
  return acuan + effectiveKelebihanPeron(K, isTBS)
}

export type RetensiStatus = 'aman' | 'terancam'

export interface HitungPertahananInput {
  /** K = keuntunganPerKg peron saat ini (per-peron, lintas semua produk). */
  keuntunganPerKg: number
  isTBS: boolean
  /** Harga acuan/lapangan produk terkait. */
  acuan: number
  /** Tawaran kompetitor ke peron (yang peron laporkan). */
  hargaKompetitor: number
  /** kg/periode utk cost/benefit. null → angka rupiah tak dihitung. */
  volume?: number | null
  ambang?: number
  minMarginTbs?: number
}

export interface HitungPertahananResult {
  isTBS: boolean
  ambang: number
  floor: number
  status: RetensiStatus

  // Kondisi sekarang
  K: number
  kelebihanEfektif: number
  hargaOCM: number
  untungEfektif: number
  gap: number

  // Usulan pertahanan (sama dengan sekarang bila AMAN)
  kenaikanDibutuhkan: number
  Kbaru: number
  kelebihanBaru: number
  hargaOCMbaru: number
  untungBaruEfektif: number
  gapSisa: number
  /** Δ margin/kg yang direlakan vs sekarang (K − Kbaru). */
  turunMargin: number
  /** Kbaru sudah di floor produk. */
  atFloor: boolean
  /** Gap sisa ≤ ambang setelah usulan → peron aman penuh dgn pertahanan senyap. */
  bisaDipertahankanPenuh: boolean
  /** Brondolan mentok cap: turunkan margin lebih jauh TAK menaikkan harga sama sekali. */
  mentokCap: boolean

  // Cost / benefit per periode volume (null bila volume tak diketahui)
  volume: number | null
  biayaPertahanan: number | null
  labaDipertahankan: number | null
  labaRisikoJikaLepas: number | null
}

/**
 * Kalkulator pertahanan harga. Menutup gap TEPAT ke ambang (bukan ke harga
 * kompetitor penuh), di-clamp ke floor produk. Untuk brondolan, cap membuat
 * harga OCM mentok di acuan+CAP: bila hargaKompetitor > acuan+CAP+ambang,
 * bisaDipertahankanPenuh=false & mentokCap=true (butuh kebijakan global, bukan
 * langgar cap diam-diam).
 */
export function hitungPertahanan(input: HitungPertahananInput): HitungPertahananResult {
  const K = input.keuntunganPerKg
  const isTBS = input.isTBS
  const acuan = input.acuan
  const hargaKompetitor = input.hargaKompetitor
  const ambang = input.ambang ?? RETENSI_DEFAULT_AMBANG
  const minMarginTbs = input.minMarginTbs ?? RETENSI_DEFAULT_MIN_MARGIN_TBS
  const volume = input.volume ?? null
  const floor = floorUntungCV(isTBS, minMarginTbs)

  const kelebihanEfektif = effectiveKelebihanPeron(K, isTBS)
  const hargaOCM = acuan + kelebihanEfektif
  const untungEfektif = effectiveKeuntunganPerKg(K, isTBS)
  const gap = hargaKompetitor - hargaOCM
  const status: RetensiStatus = gap <= ambang ? 'aman' : 'terancam'

  let kenaikanDibutuhkan = 0
  let Kbaru = K

  if (status === 'terancam') {
    kenaikanDibutuhkan = gap - ambang // naikkan harga OCM sebesar ini → gap = ambang
    const KbaruIdeal = K - kenaikanDibutuhkan // turunkan untung CV
    Kbaru = Math.min(Math.max(KbaruIdeal, floor), K) // clamp: tak di bawah floor, tak naik
  }

  const kelebihanBaru = effectiveKelebihanPeron(Kbaru, isTBS)
  const hargaOCMbaru = acuan + kelebihanBaru
  const untungBaruEfektif = effectiveKeuntunganPerKg(Kbaru, isTBS)
  const gapSisa = hargaKompetitor - hargaOCMbaru
  const bisaDipertahankanPenuh = gapSisa <= ambang
  const turunMargin = K - Kbaru
  const atFloor = status === 'terancam' && Kbaru <= floor
  // Brondolan mentok: kelebihan sudah = CAP, harga tak bisa naik lagi walau K turun.
  const mentokCap = !isTBS && !bisaDipertahankanPenuh && kelebihanBaru >= CAP_KEUNTUNGAN_PERON

  const biayaPertahanan = volume != null ? Math.round(turunMargin * volume) : null
  const labaDipertahankan = volume != null ? Math.round(untungBaruEfektif * volume) : null
  const labaRisikoJikaLepas = volume != null ? Math.round(untungEfektif * volume) : null

  return {
    isTBS,
    ambang,
    floor,
    status,
    K,
    kelebihanEfektif,
    hargaOCM,
    untungEfektif,
    gap,
    kenaikanDibutuhkan,
    Kbaru,
    kelebihanBaru,
    hargaOCMbaru,
    untungBaruEfektif,
    gapSisa,
    turunMargin,
    atFloor,
    bisaDipertahankanPenuh,
    mentokCap,
    volume,
    biayaPertahanan,
    labaDipertahankan,
    labaRisikoJikaLepas,
  }
}

/** Estimasi laba-berisiko/periode utk RANKING cockpit (volume × untung efektif). */
export function labaBerisiko(K: number, isTBS: boolean, volume: number | null): number | null {
  if (volume == null) return null
  return Math.round(effectiveKeuntunganPerKg(K, isTBS) * volume)
}

/** Produk yang bisa dipilih di kalkulator (menentukan floor & cap + acuan). */
export const RETENSI_PRODUK = ['TBS', 'BRDL KTWM', 'BRDL TRYM', 'BRDL LMDM'] as const
export type RetensiProduk = (typeof RETENSI_PRODUK)[number]

export function isProdukTBSName(produk: string): boolean {
  return isProdukTBS(produk)
}

/** Nama peron catch-all yang BUKAN hubungan tunggal — dikecualikan dari cockpit. */
export const PERON_UMUM_NAMA = 'Umum'
export function isPeronUmum(nama: string): boolean {
  return nama.trim().toLowerCase() === PERON_UMUM_NAMA.toLowerCase()
}
