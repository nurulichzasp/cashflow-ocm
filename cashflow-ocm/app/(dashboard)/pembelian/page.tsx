import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getPermissions } from '@/lib/permissions'
import { getPembelianList, getPembelianStats, getAkunKasList } from './actions'
import { getPeronList } from '../peron/actions'
import { PembelianTable } from './pembelian-table'
import { PembelianFormDialog } from './pembelian-form-dialog'
import { FloatingFab } from '@/components/fab'

export const dynamic = 'force-dynamic'

export default async function PembelianPage() {
  const [session, pembelianList, stats, peronList, akunList] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getPembelianList(),
    getPembelianStats(),
    getPeronList(),
    getAkunKasList(),
  ])

  // Edit = canEdit (owner+admin). Hapus = owner-only (deletePembelian pakai
  // requireOwner) → gate UI ke owner agar tak "tampil lalu error".
  const perms = getPermissions(session?.user.role)
  const canEdit = perms.canEdit
  const canDelete = session?.user.role === 'owner'

  const peronOptions = peronList.map((p) => ({
    id: p.id,
    nama: p.nama,
    keuntunganPerKg: p.keuntunganPerKg,
  }))

  const akunOptions = akunList.map((a) => ({
    id: a.id,
    nama: a.nama,
    tipe: a.tipe,
  }))

  return (
    <div className="space-y-5">
      <PembelianFormDialog peronOptions={peronOptions} akunOptions={akunOptions}><FloatingFab /></PembelianFormDialog>

      <PembelianTable
        pembelianList={pembelianList}
        stats={stats}
        canEdit={canEdit}
        canDelete={canDelete}
        peronOptions={peronOptions}
        akunOptions={akunOptions}
      />
    </div>
  )
}
