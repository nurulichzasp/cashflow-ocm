import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getPembelianList, getAkunKasList } from './actions'
import { getPeronList } from '../peron/actions'
import { PembelianTable } from './pembelian-table'
import { PembelianFormDialog } from './pembelian-form-dialog'
import { FloatingFab } from '@/components/fab'
import { formatCompact } from '@/lib/format'

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

  // Hero glance (semua tiket, tak ikut filter tabel). Total Beli = modal terserap
  // ke peron; itu angka keputusan utama owner. Sisanya jadi konteks pendukung.
  // Math mirror pembelian-table.tsx (totalBeli / tonase / jumlahBelum).
  const totalBeli = pembelianList.reduce((s, p) => s + p.totalBeli, 0)
  const totalTonase = pembelianList.reduce((s, p) => s + p.tonase, 0)
  const jumlahTiket = pembelianList.length
  const jumlahBelum = pembelianList.filter((p) => p.statusBayarPeron === 'belum').length

  return (
    <div className="space-y-5">
      <PembelianFormDialog peronOptions={peronOptions} akunOptions={akunOptions}><FloatingFab /></PembelianFormDialog>

      {/* HERO — satu angka dominan di paling atas: Total Beli (modal ke peron).
          Konteks pendukung (tiket, tonase, belum dibayar) di-deemphasize ke samping. */}
      {jumlahTiket > 0 && (
        <div className="surface px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-[#6B7280]">Total Beli</p>
              <p className="mt-1.5 text-[2.25rem] sm:text-[2.75rem] font-bold num tabular-nums tracking-[-0.03em] leading-none text-stone-900 dark:text-zinc-50">
                {formatCompact(totalBeli)}
              </p>
              <p className="mt-1.5 text-[11px] text-stone-400 dark:text-zinc-500">Dibayar ke peron · seluruh tiket</p>
            </div>
            <div className="flex items-center gap-5 sm:gap-6 shrink-0">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">Tiket</p>
                <p className="mt-1 text-sm font-semibold num tabular-nums text-stone-700 dark:text-zinc-300">{jumlahTiket.toLocaleString('id-ID')}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">Tonase</p>
                <p className="mt-1 text-sm font-semibold num tabular-nums text-stone-700 dark:text-zinc-300">{totalTonase.toLocaleString('id-ID')} kg</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">Belum Dibayar</p>
                <p className="mt-1 text-sm font-semibold num tabular-nums text-stone-700 dark:text-zinc-300">{jumlahBelum.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <PembelianTable
        pembelianList={pembelianList}
        isOwner={isOwner}
        peronOptions={peronOptions}
        akunOptions={akunOptions}
      />
    </div>
  )
}
