import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getHargaList } from './actions'
import { HargaTable } from './harga-table'
import { HargaFormDialog } from './harga-form-dialog'
import { FloatingFab } from '@/components/fab'
import { formatRupiah, formatTanggal } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function HargaPage() {
  const [session, hargaList] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getHargaList(),
  ])

  const isOwner = session?.user.role === 'owner'

  const tbsTerbaru = hargaList.find((h) => h.produk === 'TBS')
  const brdlKtwmTerbaru = hargaList.find((h) => h.produk === 'BRDL KTWM')

  return (
    <div className="space-y-5">
      <HargaFormDialog><FloatingFab /></HargaFormDialog>

      {(tbsTerbaru || brdlKtwmTerbaru) && (
        <div className="grid grid-cols-2 gap-3">
          {tbsTerbaru && (
            <div className="surface press-card p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1.5">TBS</p>
              <p className="text-xl font-bold text-stone-900 dark:text-zinc-50 num">
                {formatRupiah(tbsTerbaru.hargaLapangan)}<span className="text-[11px] font-normal text-stone-400 ml-0.5">/kg</span>
              </p>
              <p className="text-[11px] text-stone-400 mt-1">{formatTanggal(tbsTerbaru.tanggalBerlaku)}</p>
            </div>
          )}
          {brdlKtwmTerbaru && (
            <div className="surface press-card p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1.5">BRDL</p>
              <p className="text-xl font-bold text-stone-900 dark:text-zinc-50 num">
                {formatRupiah(brdlKtwmTerbaru.hargaLapangan)}<span className="text-[11px] font-normal text-stone-400 ml-0.5">/kg</span>
              </p>
              <p className="text-[11px] text-stone-400 mt-1">{formatTanggal(brdlKtwmTerbaru.tanggalBerlaku)}</p>
            </div>
          )}
        </div>
      )}

      <HargaTable hargaList={hargaList} isOwner={isOwner} />
    </div>
  )
}
