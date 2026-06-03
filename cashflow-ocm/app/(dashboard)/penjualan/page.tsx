import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getPenjualanList } from './actions'
import { PenjualanTable } from './penjualan-table'
import { PenjualanFormDialog } from './penjualan-form-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PenjualanPage() {
  const [session, penjualanList] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getPenjualanList(),
  ])

  const isOwner = session?.user.role === 'owner'
  const jumlahLunas = penjualanList.filter((item) => item.statusBayar === 'lunas').length
  const jumlahBelum = penjualanList.length - jumlahLunas

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Penjualan</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Kelola invoice dan status pembayaran BGA.
          </p>
        </div>
        <PenjualanFormDialog>
          <Button size="sm" className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4" />
            Tambah Penjualan
          </Button>
        </PenjualanFormDialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Total Transaksi</p>
          <p className="text-2xl font-bold text-stone-900 num">{penjualanList.length}</p>
          <p className="text-xs text-stone-400 mt-1">Penjualan yang tercatat</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm border-l-4 border-l-green-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Lunas</p>
          <p className="text-2xl font-bold text-green-600 num">{jumlahLunas}</p>
          <p className="text-xs text-stone-400 mt-1">Sudah dibayar BGA</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm border-l-4 border-l-red-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Piutang</p>
          <p className="text-2xl font-bold text-red-600 num">{jumlahBelum}</p>
          <p className="text-xs text-stone-400 mt-1">Belum dibayar BGA</p>
        </div>
      </div>

      <PenjualanTable penjualanList={penjualanList} isOwner={isOwner} />
    </div>
  )
}
