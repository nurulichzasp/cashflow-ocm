import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getKasTransactions, getAkunKasList } from './actions'
import { KasTable } from './kas-table'
import { KasFormDialog } from './kas-form-dialog'
import { Button } from '@/components/ui/button'
import { FloatingFab } from '@/components/fab'
import { formatRupiah } from '@/lib/format'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function KasPage() {
  const [session, transaksiList, akunList] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getKasTransactions(),
    getAkunKasList(),
  ])

  const isOwner = session?.user.role === 'owner'

  // Hitung saldo per akun = saldoAwal + mutasi
  const mutasiPerAkun: Record<string, number> = {}
  for (const t of transaksiList) {
    const prev = mutasiPerAkun[t.akunId] ?? 0
    mutasiPerAkun[t.akunId] = prev + (t.arah === 'masuk' ? t.jumlah : -t.jumlah)
  }

  const akunSaldo = akunList.map((a) => ({
    ...a,
    saldo: a.saldoAwal + (mutasiPerAkun[a.id] ?? 0),
  }))

  const totalMasuk = transaksiList.filter((t) => t.arah === 'masuk').reduce((s, t) => s + t.jumlah, 0)
  const totalKeluar = transaksiList.filter((t) => t.arah === 'keluar').reduce((s, t) => s + t.jumlah, 0)

  const akunOptions = akunList.map((a) => ({ id: a.id, nama: a.nama, tipe: a.tipe }))

  return (
    <div className="space-y-5">
      <div className="hidden md:flex items-center justify-end">
        <KasFormDialog akunOptions={akunOptions}>
          <Button size="sm" className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4" />Tambah
          </Button>
        </KasFormDialog>
      </div>
      <KasFormDialog akunOptions={akunOptions}><FloatingFab /></KasFormDialog>

      {/* Saldo per akun */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {akunSaldo.map((a, i) => {
          const colors = ['border-l-green-500', 'border-l-blue-500', 'border-l-violet-500', 'border-l-amber-500', 'border-l-stone-400']
          return (
            <div key={a.id} className="surface lift p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1.5 truncate">{a.nama}</p>
              <p className={`text-xl font-bold num tabular-nums ${a.saldo >= 0 ? 'text-stone-900 dark:text-stone-100' : 'text-red-600 dark:text-red-400'}`}>
                {formatRupiah(a.saldo)}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                {a.tipe === 'bank' ? 'Rekening Bank' : 'Uang Tunai'}
              </p>
            </div>
          )
        })}
      </div>

      {/* Total masuk / keluar */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Total Masuk</p>
          <p className="text-2xl font-bold text-[#3B82F6] dark:text-[#3B82F6] num">{formatRupiah(totalMasuk)}</p>
          <p className="text-xs text-stone-400 mt-1">Seluruh penerimaan tercatat</p>
        </div>
        <div className="surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Total Keluar</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-[#D97757] num">{formatRupiah(totalKeluar)}</p>
          <p className="text-xs text-stone-400 mt-1">Seluruh pengeluaran tercatat</p>
        </div>
      </div>

      <KasTable transaksiList={transaksiList} isOwner={isOwner} />
    </div>
  )
}
