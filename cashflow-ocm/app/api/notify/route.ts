import { NextResponse } from 'next/server'
import { notifyNewPembelian, notifyNewPenjualan } from '@/lib/notification'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  // Simple session authentication check to prevent unauthorized spam
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, data } = body

    if (type === 'pembelian') {
      await notifyNewPembelian(data)
      return NextResponse.json({ success: true, message: 'Pembelian notification sent' })
    } else if (type === 'penjualan') {
      await notifyNewPenjualan(data)
      return NextResponse.json({ success: true, message: 'Penjualan notification sent' })
    } else {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Webhook notification route failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
