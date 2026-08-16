/**
 * Telegram snapshot builders — kumpulan fungsi yang menghasilkan
 * teks HTML untuk dikirim ke Telegram. Dipakai oleh:
 *  - /api/cron/daily-summary (kirim otomatis pagi/sore)
 *  - /api/telegram/webhook   (respon perintah dari user)
 *
 * Konsistensi tampilan, mudah di-extend.
 */

import { db } from './db'
import {
  transaksiKas, pembelian, penjualan, biayaOperasional,
  akunKas, peron, hargaAcuan, modalPeron,
} from './db/schema'
import { eq, sum, desc } from 'drizzle-orm'
import { formatRupiah } from './format'

/** Hari ini dalam Asia/Jakarta (YYYY-MM-DD) */
function todayJakarta(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function formattedDateID(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Asia/Jakarta',
  })
}

/** Daftar saldo per akun + total. */
export async function snapshotSaldo(): Promise<string> {
  const [akunList, transaksiRows] = await Promise.all([
    db.select().from(akunKas).orderBy(akunKas.urutan),
    db.select({
      akunId: transaksiKas.akunId,
      arah: transaksiKas.arah,
      total: sum(transaksiKas.jumlah),
    }).from(transaksiKas).groupBy(transaksiKas.akunId, transaksiKas.arah),
  ])

  const mut: Record<string, number> = {}
  for (const r of transaksiRows) {
    mut[r.akunId] = (mut[r.akunId] ?? 0) +
      (r.arah === 'masuk' ? Number(r.total ?? 0) : -Number(r.total ?? 0))
  }

  const akunSaldo = akunList.map((a) => ({ ...a, saldo: a.saldoAwal + (mut[a.id] ?? 0) }))
  const total = akunSaldo.reduce((s, a) => s + a.saldo, 0)

  const lines = akunSaldo.map((a) => {
    const icon = a.tipe === 'bank' ? '🏛️' : '💵'
    return `${icon} <b>${a.nama}:</b> ${formatRupiah(a.saldo)}`
  })

  return [
    `<b>🏦 SALDO KAS &amp; REKENING</b>`,
    `🕐 ${formattedDateID()}`,
    ``,
    ...lines,
    ``,
    `━━━━━━━━━━━━━━━`,
    `💰 <b>TOTAL: ${formatRupiah(total)}</b>`,
  ].join('\n')
}

/** Ringkasan transaksi hari ini. */
export async function snapshotHariIni(): Promise<string> {
  const today = todayJakarta()

  const [pembelianRow, penjualanRow, biayaRow] = await Promise.all([
    db.select({
      tonase: sum(pembelian.tonase),
      beli: sum(pembelian.totalBeli),
      untung: sum(pembelian.keuntungan),
    }).from(pembelian).where(eq(pembelian.tanggal, today)),
    db.select({ total: sum(penjualan.totalBersih) })
      .from(penjualan).where(eq(penjualan.tanggal, today)),
    db.select({ total: sum(biayaOperasional.jumlah) })
      .from(biayaOperasional).where(eq(biayaOperasional.tanggal, today)),
  ])

  const tonase = Number(pembelianRow[0]?.tonase ?? 0)
  const totalBeli = Number(pembelianRow[0]?.beli ?? 0)
  const untung = Number(pembelianRow[0]?.untung ?? 0)
  const totalJual = Number(penjualanRow[0]?.total ?? 0)
  const totalBiaya = Number(biayaRow[0]?.total ?? 0)
  const netFlow = totalJual - totalBeli - totalBiaya

  return [
    `<b>📊 LAPORAN HARI INI</b>`,
    `📅 ${formattedDateID()}`,
    ``,
    `<b>📥 PEMBELIAN</b>`,
    `⚖️ Tonase: <b>${tonase.toLocaleString('id-ID')} kg</b>`,
    `💰 Total beli: <b>${formatRupiah(totalBeli)}</b>`,
    `📈 Estimasi untung: <b>${formatRupiah(untung)}</b>`,
    ``,
    `<b>📤 PENJUALAN</b>`,
    `💰 Nilai bersih: <b>${formatRupiah(totalJual)}</b>`,
    ``,
    `<b>💸 BIAYA</b>`,
    `🔴 Total: <b>${formatRupiah(totalBiaya)}</b>`,
    ``,
    `━━━━━━━━━━━━━━━`,
    `${netFlow >= 0 ? '🟢' : '🔴'} <b>Net flow hari ini: ${formatRupiah(netFlow)}</b>`,
  ].join('\n')
}

/** Piutang yang belum lunas, sort by umur. */
export async function snapshotPiutang(): Promise<string> {
  const rows = await db.select({
    tanggal: penjualan.tanggal,
    noInvoice: penjualan.noInvoice,
    totalBersih: penjualan.totalBersih,
  }).from(penjualan).where(eq(penjualan.statusBayar, 'belum'))

  if (rows.length === 0) {
    return [
      `<b>✅ PIUTANG</b>`,
      ``,
      `Tidak ada piutang tertunggak. Aman!`,
    ].join('\n')
  }

  const total = rows.reduce((s, r) => s + (r.totalBersih ?? 0), 0)
  const today = new Date()
  const sorted = rows
    .map((r) => {
      const days = Math.floor((today.getTime() - new Date(r.tanggal).getTime()) / (24 * 60 * 60 * 1000))
      return { ...r, days }
    })
    .sort((a, b) => b.days - a.days)
    .slice(0, 10) // top 10 paling lama

  const lines = sorted.map((r) => {
    const dot = r.days > 30 ? '🔴' : r.days > 14 ? '🟡' : '⚪'
    const inv = (r.noInvoice ?? '—').split('\n')[0].slice(0, 32)
    return `${dot} <b>${r.days}d</b> · ${inv}\n   ${formatRupiah(r.totalBersih ?? 0)}`
  })

  return [
    `<b>📋 PIUTANG BELUM LUNAS</b>`,
    `${rows.length} tagihan · ${formatRupiah(total)}`,
    ``,
    ...lines,
    rows.length > 10 ? `\n<i>… dan ${rows.length - 10} lainnya</i>` : '',
  ].filter(Boolean).join('\n')
}

/** Harga acuan terbaru per produk. */
export async function snapshotHarga(): Promise<string> {
  const produks = ['TBS', 'BRDL KTWM', 'BRDL TRYM', 'BRDL LMDM'] as const
  const rows = await Promise.all(
    produks.map(async (p) => {
      const r = await db.select().from(hargaAcuan)
        .where(eq(hargaAcuan.produk, p))
        .orderBy(desc(hargaAcuan.tanggalBerlaku))
        .limit(2)
      return { produk: p, current: r[0] ?? null, previous: r[1] ?? null }
    })
  )

  const lines = rows.map(({ produk, current, previous }) => {
    if (!current) return `⚪ <b>${produk}</b>: belum ada data`
    const delta = previous ? current.hargaLapangan - previous.hargaLapangan : 0
    const arrow = delta > 0 ? '🟢▲' : delta < 0 ? '🔴▼' : '⚪'
    const deltaText = delta !== 0 ? ` (${arrow} ${Math.abs(delta).toLocaleString('id-ID')})` : ''
    return `📦 <b>${produk}</b>: Rp ${current.hargaLapangan.toLocaleString('id-ID')}/kg${deltaText}\n   <i>Diperbarui ${current.tanggalBerlaku}</i>`
  })

  return [
    `<b>💹 HARGA ACUAN LAPANGAN</b>`,
    ``,
    ...lines,
  ].join('\n')
}

/** Margin & profitabilitas lifetime — markup peron + margin bersih setelah biaya. */
export async function snapshotMargin(): Promise<string> {
  const [pembelianAgg, penjualanAgg, untungAgg, biayaAgg] = await Promise.all([
    db.select({ total: sum(pembelian.totalBeli) }).from(pembelian),
    db.select({ total: sum(penjualan.totalBersih) }).from(penjualan),
    db.select({ total: sum(pembelian.keuntungan) }).from(pembelian),
    db.select({ total: sum(biayaOperasional.jumlah) }).from(biayaOperasional),
  ])

  const totalBeli = Number(pembelianAgg[0]?.total ?? 0)
  const totalJual = Number(penjualanAgg[0]?.total ?? 0)
  const totalUntung = Number(untungAgg[0]?.total ?? 0) // markup peron — SEBELUM biaya OCM
  const totalBiaya = Number(biayaAgg[0]?.total ?? 0)
  const marginBersih = totalUntung - totalBiaya // setelah biaya OCM sendiri
  // Persentase tetap dihitung dari markup thd pembelian (ambang sehat/tipis sudah
  // dikalibrasi ke rasio ini); kini DILABELI jujur sebagai markup, bukan "net".
  const margin = totalBeli > 0 ? (totalUntung / totalBeli) * 100 : 0
  const health = margin >= 1.5 ? '🟢 Sehat' : margin >= 0.5 ? '🟡 Moderat' : '🔴 Tipis'

  return [
    `<b>📈 MARGIN &amp; PROFITABILITAS</b>`,
    ``,
    `💰 Total revenue: <b>${formatRupiah(totalJual)}</b>`,
    `📥 Total pembelian: <b>${formatRupiah(totalBeli)}</b>`,
    `📈 Markup peron (sblm biaya): <b>${formatRupiah(totalUntung)}</b>`,
    `💸 Biaya operasional: <b>${formatRupiah(totalBiaya)}</b>`,
    `🧮 Margin bersih (stlh biaya): <b>${formatRupiah(marginBersih)}</b>`,
    ``,
    `━━━━━━━━━━━━━━━`,
    `📊 <b>Margin markup: ${margin.toFixed(2)}%</b> (thd pembelian, sblm biaya)`,
    `🩺 Status: ${health}`,
  ].join('\n')
}

/** Daftar peron aktif + DP. */
export async function snapshotPeron(): Promise<string> {
  const [list, dpRows] = await Promise.all([
    db.select().from(peron).where(eq(peron.status, 'aktif')),
    db.select({
      peronId: modalPeron.peronId,
      jenis: modalPeron.jenis,
      total: sum(modalPeron.jumlah),
    }).from(modalPeron).groupBy(modalPeron.peronId, modalPeron.jenis),
  ])

  if (list.length === 0) {
    return `<b>👥 PERON AKTIF</b>\n\nTidak ada peron aktif.`
  }

  // Hitung DP aktif per peron (tambah - kurang - kembali)
  const dpMap: Record<string, number> = {}
  for (const r of dpRows) {
    const val = Number(r.total ?? 0)
    dpMap[r.peronId] = (dpMap[r.peronId] ?? 0) + (r.jenis === 'tambah' ? val : -val)
  }

  const withDp = list.map((p) => ({ ...p, dpAktif: dpMap[p.id] ?? 0 }))
  const totalDp = withDp.reduce((s, p) => s + p.dpAktif, 0)
  const lines = withDp.map((p) =>
    `🏭 <b>${p.nama}</b> · keuntungan ${formatRupiah(p.keuntunganPerKg)}/kg\n   💵 DP: ${formatRupiah(p.dpAktif)}`
  )

  return [
    `<b>👥 PERON AKTIF</b>`,
    `${list.length} mitra · Total DP ${formatRupiah(totalDp)}`,
    ``,
    ...lines,
  ].join('\n')
}

/** Rekap harian lengkap (hari ini + saldo). Untuk cron. */
export async function snapshotDailyRecap(): Promise<string> {
  const [hari, saldo] = await Promise.all([snapshotHariIni(), snapshotSaldo()])
  // Gabung — buang header saldo karena sudah include header hari ini
  const saldoBody = saldo.split('\n').slice(2).join('\n') // skip 2 header lines
  return `${hari}\n\n${saldoBody}`
}

/** Menu bantuan. */
export function snapshotHelp(): string {
  return [
    `<b>🤖 PERINTAH BOT CV OCM</b>`,
    ``,
    `📊 <code>/hari</code> · Ringkasan hari ini`,
    `🏦 <code>/saldo</code> · Saldo rekening &amp; kas`,
    `📋 <code>/piutang</code> · Penjualan belum lunas`,
    `💹 <code>/harga</code> · Harga acuan lapangan`,
    `📈 <code>/margin</code> · Net margin &amp; profitabilitas`,
    `👥 <code>/peron</code> · Daftar peron aktif`,
    `📊 <code>/laporan</code> · Rekap lengkap hari ini`,
    `❓ <code>/help</code> · Tampilkan menu ini`,
    ``,
    `<i>Tekan perintah di atas atau ketik manual.</i>`,
  ].join('\n')
}
