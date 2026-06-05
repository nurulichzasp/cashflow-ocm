import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getPembelianList, getAkunKasList } from './actions'
import { getPeronList } from '../peron/actions'
import { PembelianTable } from './pembelian-table'
import { PembelianFormDialog } from './pembelian-form-dialog'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/format'
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

  const totalTonase = pembelianList.reduce((s, p) => s + p.tonase, 0)
  const totalBeli = pembelianList.reduce((s, p) => s + p.totalBeli, 0)
  const totalKeuntungan = pembelianList.reduce((s, p) => s + p.keuntungan, 0)
  const jumlahBelum = pembelianList.filter((p) => p.statusBayarPeron === 'belum').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Pembelian</h1>
          <p className="text-sm text-stone-500 mt-0.5">Tiket timbang BGA dari peron — satu baris per TID.</p>
        </div>
        <PembelianFormDialog peronOptions={peronOptions} akunOptions={akunOptions}>
          <Button size="sm" className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </PembelianFormDialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Total Tiket</p>
          <p className="text-2xl font-bold text-stone-900 num">{pembelianList.length}</p>
          <p className="text-xs text-stone-400 mt-1">{jumlahBelum} belum dibayar</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Total Tonase</p>
          <p className="text-2xl font-bold text-stone-900 num">{totalTonase.toLocaleString('id-ID')} kg</p>
          <p className="text-xs text-stone-400 mt-1">Netto II seluruh tiket</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Total Beli</p>
          <p className="text-2xl font-bold text-stone-900 num">{formatRupiah(totalBeli)}</p>
          <p className="text-xs text-stone-400 mt-1">Dibayarkan ke peron</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm border-l-4 border-l-green-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Estimasi Laba</p>
          <p className="text-2xl font-bold text-green-600 num">{formatRupiah(totalKeuntungan)}</p>
          <p className="text-xs text-stone-400 mt-1">Margin dari seluruh tiket</p>
        </div>
      </div>

      <PembelianTable
        pembelianList={pembelianList}
        isOwner={isOwner}
        peronOptions={peronOptions}
        akunOptions={akunOptions}
      />
    </div>
  )
}
