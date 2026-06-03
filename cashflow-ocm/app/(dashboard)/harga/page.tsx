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
            Tambah Harga
          </Button>
        </HargaFormDialog>
      </div>

      {(tbsTerbaru || brdlTerbaru) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {tbsTerbaru && (
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm border-l-4 border-l-green-500">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Harga TBS Terbaru</p>
              <p className="text-2xl font-bold text-stone-900 num">
                {formatRupiah(tbsTerbaru.hargaLapangan + tbsTerbaru.selisihJualBga)}/kg
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Lapangan {formatRupiah(tbsTerbaru.hargaLapangan)}/kg + selisih {formatRupiah(tbsTerbaru.selisihJualBga)}/kg
              </p>
            </div>
          )}
          {brdlTerbaru && (
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm border-l-4 border-l-amber-500">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Harga BRDL Terbaru</p>
              <p className="text-2xl font-bold text-stone-900 num">
                {formatRupiah(brdlTerbaru.hargaLapangan + brdlTerbaru.selisihJualBga)}/kg
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Lapangan {formatRupiah(brdlTerbaru.hargaLapangan)}/kg + selisih {formatRupiah(brdlTerbaru.selisihJualBga)}/kg
              </p>
            </div>
          )}
        </div>
      )}

      <HargaTable hargaList={hargaList} isOwner={isOwner} />
    </div>
  )
}
