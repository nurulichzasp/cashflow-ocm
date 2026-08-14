import { createClient } from '@libsql/client'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Kesalahan tidak diketahui'
}

export async function GET(request: Request) {
  const showDetails = new URL(request.url).searchParams.get('details') === '1'

  // Liveness generik boleh publik untuk pemantauan Vercel. Informasi skema dan
  // jumlah user tetap membutuhkan sesi owner lewat ?details=1.
  if (showDetails) {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session || session.user.role !== 'owner') {
      return Response.json({ error: 'Tidak terautentikasi atau bukan owner' }, { status: 401 })
    }
  }

  const databaseUrl = process.env.TURSO_CONNECTION_URL
  if (!databaseUrl) {
    return Response.json({ status: 'error' }, { status: 503 })
  }

  const client = createClient({
    url: databaseUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  try {
    // Query ringan memastikan fungsi hidup sekaligus database dapat dijangkau.
    await client.execute('SELECT 1')
    if (!showDetails) return Response.json({ status: 'ok' })

    // Cek tabel yang ada
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    const tableNames = tables.rows.map(r => r[0])

    // Cek user count
    let userCount = 0
    if (tableNames.includes('user')) {
      const users = await client.execute("SELECT COUNT(*) as cnt FROM user")
      userCount = Number(users.rows[0][0])
    }

    return Response.json({
      status: 'ok',
      tables: tableNames,
      user_count: userCount,
    })
  } catch (error: unknown) {
    return Response.json(
      showDetails
        ? { status: 'error', message: errorMessage(error) }
        : { status: 'error' },
      { status: 503 },
    )
  } finally {
    client.close()
  }
}

import { db } from '@/lib/db'
import {
  pembelian,
  pembelianDetail,
  pembelianFoto,
  penjualan,
  penjualanDetail,
  biayaOperasional,
  biayaFoto,
  transaksiKas,
} from '@/lib/db/schema'
import { logActivity } from '@/lib/audit'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'owner') {
    return Response.json({ error: 'Tidak terautentikasi atau bukan owner' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const clear = searchParams.get('clear')

  if (clear === '1') {
    // GUARD aksi destruktif: hapus SEMUA transaksi tidak bisa dibatalkan. Wajib
    // konfirmasi eksplisit di body agar tidak terpicu tak sengaja / oleh skrip.
    let confirmPhrase: string | undefined
    try {
      const body = await request.json()
      confirmPhrase = body?.confirm
    } catch {
      confirmPhrase = undefined
    }
    if (confirmPhrase !== 'HAPUS-SEMUA-DATA') {
      return Response.json(
        { error: 'Konfirmasi diperlukan. Kirim body JSON { "confirm": "HAPUS-SEMUA-DATA" } untuk menghapus seluruh data transaksi.' },
        { status: 428 },
      )
    }

    try {
      await db.transaction(async (tx) => {
        await tx.delete(pembelianFoto)
        await tx.delete(pembelianDetail)
        await tx.delete(pembelian)
        await tx.delete(penjualanDetail)
        await tx.delete(penjualan)
        await tx.delete(biayaFoto)
        await tx.delete(biayaOperasional)
        await tx.delete(transaksiKas)
      })
      // Catat siapa yang melakukan reset total ke audit trail.
      await logActivity({
        userId: session.user.id,
        action: 'delete',
        entityType: 'transaksi_kas',
        description: 'RESET TOTAL: menghapus seluruh data transaksi (pembelian, penjualan, biaya, kas)',
      })
      return Response.json({ success: true, message: 'Seluruh data transaksi berhasil dibersihkan' })
    } catch (error: unknown) {
      return Response.json({ error: errorMessage(error) }, { status: 500 })
    }
  }

  return Response.json({ error: 'Aksi tidak didukung' }, { status: 400 })
}
