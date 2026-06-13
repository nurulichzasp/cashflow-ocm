import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getPenjualanList } from './actions'
import { getEstimasiLaba } from '../pembelian/actions'
import { PenjualanTable } from './penjualan-table'
import { PenjualanFormDialog } from './penjualan-form-dialog'
import { FloatingFab } from '@/components/fab'
import { formatCompact } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function PenjualanPage() {
  const [session, penjualanList, estimasiLaba] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getPenjualanList(),
    getEstimasiLaba(),
  ])

  const isOwner = session?.user.role === 'owner'

  const totalPenjualan = penjualanList.reduce((s, p) => s + (p.totalBersih ?? 0), 0)
  const totalPpn = penjualanList.reduce((s, p) => {
    const bersih = p.totalBersih ?? 0
    const nilai = p.totalNilai ?? 0
    return s + (nilai > bersih ? nilai - bersih : 0)
  }, 0)

  return (
    <div className="space-y-5">
      <PenjualanFormDialog><FloatingFab /></PenjualanFormDialog>

      {/* Ringkasan — satu hero premium (selaras Pembelian). Angka utama = Total
          Penjualan (nilai bersih); Transaksi/PPN/Margin jadi konteks samping. */}
      <div className="surface px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-[#6B7280]">Total Penjualan</p>
            <p className="mt-1.5 text-[2.25rem] sm:text-[2.75rem] font-bold num tabular-nums tracking-[-0.03em] leading-none text-stone-900 dark:text-zinc-50">
              {formatCompact(totalPenjualan)}
            </p>
            <p className="mt-1.5 text-[11px] text-stone-400 dark:text-zinc-500">Nilai bersih · seluruh transaksi</p>
          </div>
          <div className="flex items-center gap-5 sm:gap-6 shrink-0">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">Transaksi</p>
              <p className="mt-1 text-sm font-semibold num tabular-nums text-stone-700 dark:text-zinc-300">{penjualanList.length.toLocaleString('id-ID')}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">PPN</p>
              <p className="mt-1 text-sm font-semibold num tabular-nums text-stone-700 dark:text-zinc-300">{formatCompact(totalPpn)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">Margin</p>
              <p className="mt-1 text-sm font-semibold num tabular-nums text-stone-700 dark:text-zinc-300">{formatCompact(estimasiLaba)}</p>
            </div>
          </div>
        </div>
      </div>

      <PenjualanTable penjualanList={penjualanList} isOwner={isOwner} />
    </div>
  )
}
