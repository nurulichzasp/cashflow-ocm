import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { hasUserPermission } from '@/lib/permissions'
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
  const canEdit = session ? hasUserPermission(session.user, 'canEdit', 'pembelian') : false
  const canCreate = session ? hasUserPermission(session.user, 'canCreate', 'pembelian') : false
  const canDelete = session?.user.role === 'owner'

  // Peron nonaktif tetap ada di riwayat dan halaman Peron, tetapi tidak boleh
  // dipilih untuk transaksi pembelian baru.
  const peronOptions = peronList
    .filter((p) => p.status === 'aktif')
    .map((p) => ({
      id: p.id,
      nama: p.nama,
      keuntunganPerKg: p.keuntunganPerKg,
      tarif: p.tarif.map((t) => ({
        tanggalBerlaku: t.tanggalBerlaku,
        kelebihanPerKg: t.kelebihanPerKg,
        brdlSamaTbs: t.brdlSamaTbs,
      })),
    }))

  const akunOptions = akunList.map((a) => ({
    id: a.id,
    nama: a.nama,
    tipe: a.tipe,
  }))

  return (
    <div className="space-y-5">
      {canCreate && <PembelianFormDialog peronOptions={peronOptions} akunOptions={akunOptions}><FloatingFab /></PembelianFormDialog>}

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
