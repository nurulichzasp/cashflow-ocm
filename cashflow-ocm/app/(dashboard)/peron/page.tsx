import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getPeronList } from './actions'
import { PeronTable } from './peron-table'
import { PeronFormDialog } from './peron-form-dialog'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/format'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PeronPage() {
  const [session, peronList] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getPeronList(),
  ])

  const isOwner = session?.user.role === 'owner'
  const totalAktif = peronList.filter((p) => p.status === 'aktif').length
  const totalDp = peronList.reduce((sum, p) => sum + p.dpAktif, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Peron</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Kelola penengkulak masyarakat yang bermitra dengan CV OCM.
          </p>
        </div>
        <PeronFormDialog mode="create">
          <Button size="sm" className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </PeronFormDialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Total Peron</p>
          <p className="text-2xl font-bold text-stone-900 num">{peronList.length}</p>
          <p className="text-xs text-stone-400 mt-1">{totalAktif} aktif saat ini</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm border-l-4 border-l-green-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Aktif</p>
          <p className="text-2xl font-bold text-green-600 num">{totalAktif}</p>
          <p className="text-xs text-stone-400 mt-1">Peron yang sedang bermitra</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm border-l-4 border-l-orange-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Total DP Beredar</p>
          <p className="text-2xl font-bold text-orange-600 num">{formatRupiah(totalDp)}</p>
          <p className="text-xs text-stone-400 mt-1">Modal yang sedang di peron</p>
        </div>
      </div>

      <PeronTable peronList={peronList} isOwner={isOwner} />
    </div>
  )
}
