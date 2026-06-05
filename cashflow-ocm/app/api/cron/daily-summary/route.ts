import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  transaksiKas,
  pembelian,
  penjualan,
  biayaOperasional,
  akunKas,
} from '@/lib/db/schema'
import { eq, sum } from 'drizzle-orm'
import { sendTelegramMessage } from '@/lib/notification'
import { formatRupiah } from '@/lib/format'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Security Check for Vercel Cron
  const authHeader = request.headers.get('authorization')
  const { searchParams } = new URL(request.url)
  const secretParam = searchParams.get('secret')

  const cronSecret = process.env.CRON_SECRET
  const isCronSecretValid = cronSecret && authHeader === `Bearer ${cronSecret}`
  const isManualSecretValid = cronSecret && secretParam === cronSecret

  if (process.env.NODE_ENV === 'production' && !isCronSecretValid && !isManualSecretValid) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Get today's date in Asia/Jakarta timezone
    const today = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())

    const formattedDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // 1. Pembelian Hari Ini
    const [pembelianData] = await db
      .select({
        totalTonase: sum(pembelian.tonase),
        totalBeli: sum(pembelian.totalBeli),
        totalKeuntungan: sum(pembelian.keuntungan),
      })
      .from(pembelian)
      .where(eq(pembelian.tanggal, today))

    const tonase = Number(pembelianData?.totalTonase ?? 0)
    const totalBeli = Number(pembelianData?.totalBeli ?? 0)
    const keuntungan = Number(pembelianData?.totalKeuntungan ?? 0)

    // 2. Penjualan Hari Ini
    const [penjualanData] = await db
      .select({
        totalBersih: sum(penjualan.totalBersih),
      })
      .from(penjualan)
      .where(eq(penjualan.tanggal, today))

    const totalPenjualan = Number(penjualanData?.totalBersih ?? 0)

    // 3. Biaya Hari Ini
    const [biayaData] = await db
      .select({
        totalBiaya: sum(biayaOperasional.jumlah),
      })
      .from(biayaOperasional)
      .where(eq(biayaOperasional.tanggal, today))

    const totalBiaya = Number(biayaData?.totalBiaya ?? 0)

    // 4. Saldo Kas & Rekening (Closing Balance)
    const [akunList, transaksiRows] = await Promise.all([
      db.select().from(akunKas).orderBy(akunKas.urutan),
      db.select({
        akunId: transaksiKas.akunId,
        arah: transaksiKas.arah,
        total: sum(transaksiKas.jumlah),
      })
      .from(transaksiKas)
      .groupBy(transaksiKas.akunId, transaksiKas.arah),
    ])

    const mutasiPerAkun: Record<string, number> = {}
    for (const r of transaksiRows) {
      const prev = mutasiPerAkun[r.akunId] ?? 0
      mutasiPerAkun[r.akunId] = prev + (r.arah === 'masuk' ? Number(r.total ?? 0) : -Number(r.total ?? 0))
    }

    const akunSaldo = akunList.map((a) => ({
      ...a,
      saldo: a.saldoAwal + (mutasiPerAkun[a.id] ?? 0),
    }))

    const totalSaldo = akunSaldo.reduce((sum, a) => sum + a.saldo, 0)

    // Build the balance list
    const balancesList = akunSaldo
      .map((a) => {
        const icon = a.tipe === 'bank' ? '🏛️' : '💵'
        return `${icon} <b>${a.nama}:</b> ${formatRupiah(a.saldo)}`
      })
      .join('\n')

    // 5. Build and Send Telegram Message
    const message = [
      `<b>📊 LAPORAN RINGKASAN HARIAN</b>`,
      `📅 <b>Hari/Tanggal:</b> ${formattedDate}`,
      ``,
      `<b>📥 Pembelian Sawit Hari Ini:</b>`,
      `⚖️ <b>Total Tonase:</b> ${tonase.toLocaleString('id-ID')} kg`,
      `💰 <b>Total Beli:</b> ${formatRupiah(totalBeli)}`,
      `📈 <b>Estimasi Untung:</b> ${formatRupiah(keuntungan)}`,
      ``,
      `<b>📤 Penjualan Sawit Hari Ini:</b>`,
      `💰 <b>Total Nilai Bersih BGA:</b> ${formatRupiah(totalPenjualan)}`,
      ``,
      `<b>💸 Pengeluaran Hari Ini:</b>`,
      `🔴 <b>Total Biaya Operasional:</b> ${formatRupiah(totalBiaya)}`,
      ``,
      `<b>🏛️ Saldo Akhir Rekening & Kas:</b>`,
      balancesList,
      `💰 <b>Total Saldo Kas:</b> <b>${formatRupiah(totalSaldo)}</b>`,
    ].join('\n')

    const success = await sendTelegramMessage(message)

    return NextResponse.json({
      success,
      date: today,
      metrics: {
        tonase,
        totalBeli,
        keuntungan,
        totalPenjualan,
        totalBiaya,
        totalSaldo,
      },
    })
  } catch (error) {
    console.error('Failed to generate daily summary:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
