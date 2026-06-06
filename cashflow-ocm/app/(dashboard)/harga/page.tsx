import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getHargaList } from './actions'
import { HargaTable } from './harga-table'
import { HargaFormDialog } from './harga-form-dialog'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/format'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HargaPage() {
  const [session, hargaList] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getHargaList(),
  ])

  const isOwner = session?.user.role === 'owner'

  const tbsTerbaru = hargaList.find((h) => h.produk === 'TBS')
  const brdlTerbaru = hargaList.find((h) => h.produk === 'BRDL')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Harga Acuan</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Harga lapangan dan selisih jual BGA per produk. Tambah baru setiap harga berubah.
          </p>
        </div>
        <HargaFormDialog>
          <Button size="sm" className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </HargaFormDialog>
      </div>

      {(tbsTerbaru || brdlTerbaru) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {tbsTerbaru && (
            <div className="surface p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">TBS — Harga Terbaru</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-[#D97757] num">
                {formatRupiah(tbsTerbaru.hargaLapangan + tbsTerbaru.selisihJualBga)}<span className="text-sm font-normal text-stone-400 ml-1">/kg</span>
              </p>
              <p className="text-xs text-stone-400 mt-1.5">
                Lapangan {formatRupiah(tbsTerbaru.hargaLapangan)} + selisih {formatRupiah(tbsTerbaru.selisihJualBga)}
              </p>
            </div>
          )}
          {brdlTerbaru && (
            <div className="surface p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">BRDL — Harga Terbaru</p>
              <p className="text-2xl font-bold text-stone-900 num">
                {formatRupiah(brdlTerbaru.hargaLapangan + brdlTerbaru.selisihJualBga)}<span className="text-sm font-normal text-stone-400 ml-1">/kg</span>
              </p>
              <p className="text-xs text-stone-400 mt-1.5">
                Lapangan {formatRupiah(brdlTerbaru.hargaLapangan)} + selisih {formatRupiah(brdlTerbaru.selisihJualBga)}
              </p>
            </div>
          )}
        </div>
      )}

      <HargaTable hargaList={hargaList} isOwner={isOwner} />
    </div>
  )
}
