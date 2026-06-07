import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getPembelianList, getAkunKasList } from './actions'
import { getPeronList } from '../peron/actions'
import { PembelianTable } from './pembelian-table'
import { PembelianFormDialog } from './pembelian-form-dialog'
import { Button } from '@/components/ui/button'
import { FloatingFab } from '@/components/fab'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PembelianPage() {
  const [session, pembelianList, peronList, akunList] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getPembelianList(),
    getPeronList(),
    getAkunKasList(),
  ])

  const isOwner = session?.user.role === 'owner'

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
      <div className="hidden md:flex items-center justify-end">
        <PembelianFormDialog peronOptions={peronOptions} akunOptions={akunOptions}>
          <Button size="sm" className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4" />Tambah
          </Button>
        </PembelianFormDialog>
      </div>
      <PembelianFormDialog peronOptions={peronOptions} akunOptions={akunOptions}><FloatingFab /></PembelianFormDialog>

      <PembelianTable
        pembelianList={pembelianList}
        isOwner={isOwner}
        peronOptions={peronOptions}
        akunOptions={akunOptions}
      />
    </div>
  )
}
