export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user, hargaAcuan } from '@/lib/db/schema'
import { asc, desc, eq } from 'drizzle-orm'
import { SettingsClient } from './settings-client'
import { formatRupiah } from '@/lib/format'

export default async function PengaturanPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const dbUsers = await db.select().from(user).orderBy(asc(user.name))

  // Ambil selisih BGA terbaru per produk untuk ditampilkan di settings
  const produkList = ['TBS', 'BRDL KTWM', 'BRDL TRYM', 'BRDL LMDM'] as const
  const selisihData = await Promise.all(
    produkList.map(async (p) => {
      const rows = await db.select().from(hargaAcuan)
        .where(eq(hargaAcuan.produk, p))
        .orderBy(desc(hargaAcuan.tanggalBerlaku))
        .limit(1)
      return { produk: p, selisih: rows[0]?.selisihJualBga ?? null }
    })
  )

  const initialUsers = dbUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    image: u.image || null,
    permissions: u.permissions || null,
  }))

  return (
    <div className="space-y-6">
      {/* Selisih Jual BGA */}
      <div className="surface p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Selisih Jual BGA / kg</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {selisihData.map(({ produk, selisih }) => (
            <div key={produk} className="space-y-0.5">
              <p className="text-[11px] font-mono font-semibold text-stone-500">{produk}</p>
              <p className="text-base font-bold text-stone-900 num">
                {selisih !== null ? formatRupiah(selisih) : <span className="text-stone-400 text-sm font-normal">—</span>}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-400">Selisih diambil dari data harga acuan terbaru masing-masing produk.</p>
      </div>

      <SettingsClient
        currentUser={{
          id: session.user.id,
          role: session.user.role || 'admin',
        }}
        initialUsers={initialUsers}
      />
    </div>
  )
}
