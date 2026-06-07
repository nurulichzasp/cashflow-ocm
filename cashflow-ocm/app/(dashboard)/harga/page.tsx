import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getHargaList } from './actions'
import { HargaTable } from './harga-table'
import { HargaFormDialog } from './harga-form-dialog'
import { Button } from '@/components/ui/button'
import { FloatingFab } from '@/components/fab'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { Plus } from 'lucide-react'

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
      <div className="hidden md:flex items-center justify-end">
        <HargaFormDialog>
          <Button size="sm" className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4" />Tambah
          </Button>
        </HargaFormDialog>
      </div>
      <HargaFormDialog><FloatingFab /></HargaFormDialog>

      {(tbsTerbaru || brdlKtwmTerbaru) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {tbsTerbaru && (
            <div className="surface press-card p-3 sm:p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">TBS — Harga Terbaru</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-[#D97757] num">
                {formatRupiah(tbsTerbaru.hargaLapangan)}<span className="text-sm font-normal text-stone-400 ml-1">/kg</span>
              </p>
              <p className="text-xs text-stone-400 mt-1.5">
                Diperbarui {formatTanggal(tbsTerbaru.tanggalBerlaku)}
              </p>
            </div>
          )}
          {brdlKtwmTerbaru && (
            <div className="surface press-card p-3 sm:p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">BRDL KTWM — Harga Terbaru</p>
              <p className="text-2xl font-bold text-stone-900 num">
                {formatRupiah(brdlKtwmTerbaru.hargaLapangan)}<span className="text-sm font-normal text-stone-400 ml-1">/kg</span>
              </p>
              <p className="text-xs text-stone-400 mt-1.5">
                Diperbarui {formatTanggal(brdlKtwmTerbaru.tanggalBerlaku)}
              </p>
            </div>
          )}
        </div>
      )}

      <HargaTable hargaList={hargaList} isOwner={isOwner} />
    </div>
  )
}
