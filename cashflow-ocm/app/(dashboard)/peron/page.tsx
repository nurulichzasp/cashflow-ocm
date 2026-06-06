import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getPeronList } from './actions'
import { PeronTable } from './peron-table'
import { PeronFormDialog } from './peron-form-dialog'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/format'
import { Plus } from 'lucide-react'
import { db } from '@/lib/db'
import { akunKas } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export default async function PeronPage() {
  const [session, peronList, akunList] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getPeronList(),
    db.select().from(akunKas).orderBy(akunKas.urutan),
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
        <div className="surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1.5">Total Peron</p>
          <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 num tabular-nums">{peronList.length}</p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{totalAktif} aktif saat ini</p>
        </div>
        <div className="surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1.5">Aktif</p>
          <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 num tabular-nums">{totalAktif}</p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Peron yang sedang bermitra</p>
        </div>
        <div className="surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1.5">Total DP Beredar</p>
          <p className="text-2xl font-bold text-primary num tabular-nums">{formatRupiah(totalDp)}</p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Modal yang sedang di peron</p>
        </div>
      </div>

      <PeronTable peronList={peronList} isOwner={isOwner} akunOptions={akunList.map(a => ({ id: a.id, nama: a.nama, tipe: a.tipe }))} />
    </div>
  )
}
