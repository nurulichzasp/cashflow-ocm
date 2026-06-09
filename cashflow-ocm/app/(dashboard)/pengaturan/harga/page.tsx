export const dynamic = 'force-dynamic'

import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { hargaAcuan } from '@/lib/db/schema'
import { formatRupiah } from '@/lib/format'
import { SettingHeader } from '../_components/setting-header'
import { requireSettingsSession } from '../_components/require-session'

export default async function HargaPage() {
  await requireSettingsSession()

  const produkList = ['TBS', 'BRDL KTWM', 'BRDL TRYM', 'BRDL LMDM'] as const
  const selisihData = await Promise.all(
    produkList.map(async (p) => {
      const rows = await db
        .select()
        .from(hargaAcuan)
        .where(eq(hargaAcuan.produk, p))
        .orderBy(desc(hargaAcuan.tanggalBerlaku))
        .limit(1)
      return { produk: p, selisih: rows[0]?.selisihJualBga ?? null }
    }),
  )

  return (
    <div className="space-y-6 max-w-3xl">
      <SettingHeader
        title="Harga & Margin"
        description="Selisih jual ke BGA per kilogram, diambil dari data harga acuan terbaru tiap produk."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {selisihData.map(({ produk, selisih }) => (
          <div key={produk} className="surface p-4 space-y-1.5">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              {produk}
            </p>
            <p className="num text-xl font-bold text-stone-900 dark:text-zinc-50">
              {selisih !== null ? (
                formatRupiah(selisih)
              ) : (
                <span className="text-base font-normal text-stone-400">—</span>
              )}
            </p>
            <p className="text-[11px] text-stone-400 dark:text-stone-500">per kg</p>
          </div>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-stone-400 dark:text-stone-500">
        Nilai ini dikelola otomatis lewat data harga acuan saat mencatat transaksi. Untuk mengubahnya,
        perbarui harga acuan pada modul pembelian.
      </p>
    </div>
  )
}
