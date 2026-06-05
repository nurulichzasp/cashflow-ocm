import { createClient } from '@libsql/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const client = createClient({
      url: process.env.TURSO_CONNECTION_URL ?? 'NOT SET',
      authToken: process.env.TURSO_AUTH_TOKEN,
    })

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
      turso_url: process.env.TURSO_CONNECTION_URL?.replace(/\/\/.*@/, '//***@').slice(0, 60),
      tables: tableNames,
      user_count: userCount,
    })
  } catch (e: any) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 })
  }
}

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
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

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'owner') {
    return Response.json({ error: 'Tidak terautentikasi atau bukan owner' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const clear = searchParams.get('clear')

  if (clear === '1') {
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
      return Response.json({ success: true, message: 'Seluruh data transaksi berhasil dibersihkan' })
    } catch (e: any) {
      return Response.json({ error: e.message }, { status: 500 })
    }
  }

  return Response.json({ error: 'Aksi tidak didukung' }, { status: 400 })
}
