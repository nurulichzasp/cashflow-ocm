export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount)
}

/**
 * Ringkas & elegan untuk angka GLANCE (kartu ringkasan, hero, KPI):
 *   1.234.567.890 → "Rp 1,23 M" · 296.801.560 → "Rp 296,8 jt" · 45.000 → "Rp 45 rb"
 * Tujuan: terbaca dalam 3 detik, sedikit digit. Tabel/detail/form TETAP pakai
 * formatRupiah() (presisi penuh ke rupiah).
 */
export function formatCompact(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const a = Math.abs(amount)
  const f = (v: number, dec: number) =>
    v.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: dec })
  if (a >= 1_000_000_000) return `${sign}Rp ${f(a / 1_000_000_000, 2)} M`
  if (a >= 1_000_000) return `${sign}Rp ${f(a / 1_000_000, 1)} jt`
  if (a >= 1_000) return `${sign}Rp ${f(a / 1_000, 0)} rb`
  return `${sign}Rp ${f(a, 0)}`
}

/** Sama seperti formatCompact tapi tanpa prefix "Rp" (untuk render hierarki tipografi). */
export function formatCompactValue(amount: number): string {
  return formatCompact(amount).replace(/^(-?)Rp\s/, '$1')
}

export function formatTanggal(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

/**
 * Tanggal lengkap dengan nama hari: "Rabu, 10 Juni 2026".
 * Untuk konteks tunggal (header detail, sapaan dashboard) — BUKAN tabel padat
 * (terlalu lebar). Tabel tetap pakai formatTanggal().
 */
export function formatTanggalLengkap(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

// Tanggal di zona WIB (Asia/Jakarta), YYYY-MM-DD. Sadar-zona supaya KONSISTEN
// di server (Vercel = UTC) maupun client — toISOString()/local bikin entri dini
// hari WIB mundur 1 hari. offsetDays untuk hitung mundur (mis. -30 hari).
export function jakartaDateString(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

export function todayString(): string {
  return jakartaDateString()
}

// Nama bulan ID — dipakai formatter rentang replas (hindari ketergantungan locale
// agar dash "–" & singkatan konsisten lintas platform).
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
}

/**
 * Kotak tanggal replas (ringkas, bulan pendek) untuk trigger kalender 1-kotak:
 *   tunggal               → "4 Jun"
 *   rentang sebulan       → "4–5 Jun"
 *   rentang beda bulan    → "30 Mei – 2 Jun"
 *   rentang beda tahun    → "28 Des 2025 – 3 Jan 2026"
 * `sampai` kosong/sama dengan `dari` → dianggap tunggal.
 */
export function formatRentangKotak(dari: string, sampai?: string | null): string {
  const f = parseYmd(dari)
  if (!f) return ''
  if (!sampai || sampai === dari) return `${f.d} ${BULAN_PENDEK[f.m - 1]}`
  const t = parseYmd(sampai)
  if (!t) return `${f.d} ${BULAN_PENDEK[f.m - 1]}`
  if (f.y === t.y && f.m === t.m) return `${f.d}–${t.d} ${BULAN_PENDEK[f.m - 1]}`
  if (f.y === t.y) return `${f.d} ${BULAN_PENDEK[f.m - 1]} – ${t.d} ${BULAN_PENDEK[t.m - 1]}`
  return `${f.d} ${BULAN_PENDEK[f.m - 1]} ${f.y} – ${t.d} ${BULAN_PENDEK[t.m - 1]} ${t.y}`
}

/**
 * Label rentang filter untuk subteks hero (ikut DateRangeFilter, bisa 1 sisi):
 *   dari & sampai → "1–10 Jun" (pakai formatRentangKotak)
 *   dari saja     → "sejak 1 Jun"
 *   sampai saja   → "s/d 10 Jun"
 *   keduanya kosong → "" (pemanggil pakai teks all-time)
 */
export function formatRentangFilter(dari?: string, sampai?: string): string {
  if (dari && sampai) return formatRentangKotak(dari, sampai)
  if (dari) return `sejak ${formatTanggalPendek(dari)}`
  if (sampai) return `s/d ${formatTanggalPendek(sampai)}`
  return ''
}

/**
 * Rentang tanggal untuk keterangan tiket (bulan panjang):
 *   min == max            → "7 Juni"
 *   sebulan & setahun     → "4–7 Juni"
 *   beda bulan, setahun   → "30 Mei – 2 Juni"
 *   beda tahun            → "28 Des 2025 – 3 Jan 2026"
 */
export function formatRentangReplas(min: string, max: string): string {
  const f = parseYmd(min)
  const t = parseYmd(max)
  if (!f || !t) return ''
  if (min === max) return `${f.d} ${BULAN_PANJANG[f.m - 1]}`
  if (f.y === t.y && f.m === t.m) return `${f.d}–${t.d} ${BULAN_PANJANG[f.m - 1]}`
  if (f.y === t.y) return `${f.d} ${BULAN_PANJANG[f.m - 1]} – ${t.d} ${BULAN_PANJANG[t.m - 1]}`
  return `${f.d} ${BULAN_PENDEK[f.m - 1]} ${f.y} – ${t.d} ${BULAN_PENDEK[t.m - 1]} ${t.y}`
}

/**
 * Tanggal pendek untuk kotak sempit: "11 Jun" (tahun disembunyikan bila = tahun
 * berjalan), atau "11 Jun 2025" bila beda tahun. Muat 1 baris di HP.
 */
export function formatTanggalPendek(date: string): string {
  const f = parseYmd(date)
  if (!f) return ''
  const curY = new Date().getFullYear()
  return f.y === curY
    ? `${f.d} ${BULAN_PENDEK[f.m - 1]}`
    : `${f.d} ${BULAN_PENDEK[f.m - 1]} ${f.y}`
}

type ReplasDetail = {
  tonase: number | string
  jumlahReplas?: number | string | null
  tanggalReplas?: string | null
  tanggalReplasSampai?: string | null
}

/**
 * SATU SUMBER keterangan tiket: "Total {N} Replas ({rentang})".
 * Dipakai PERSIS sama oleh form pembelian (live) & nota cetak (3 mode). Menerima
 * detail bentuk string (form) maupun number (DB). Semua baris replas tonase 0 →
 * string kosong (sama dgn perilaku form). `fallbackTanggal` = tanggal header tiket.
 */
export function buildKeteranganReplas(details: ReplasDetail[], fallbackTanggal: string): string {
  const num = (v: number | string | null | undefined) => (typeof v === 'number' ? v : parseFloat(String(v ?? '')) || 0)
  const int = (v: number | string | null | undefined) => (typeof v === 'number' ? Math.trunc(v) : parseInt(String(v ?? ''), 10) || 0)
  const rows = details.filter((d) => num(d.tonase) > 0)
  if (rows.length === 0) return ''
  const totalReplas = rows.reduce((s, d) => s + int(d.jumlahReplas), 0)
  const froms = rows.map((d) => d.tanggalReplas || fallbackTanggal).filter(Boolean) as string[]
  const tos = rows.map((d) => d.tanggalReplasSampai || d.tanggalReplas || fallbackTanggal).filter(Boolean) as string[]
  if (froms.length === 0) return ''
  const min = froms.reduce((a, b) => (a < b ? a : b))
  const max = tos.reduce((a, b) => (a > b ? a : b))
  return `Total ${totalReplas} Replas (${formatRentangReplas(min, max)})`
}
