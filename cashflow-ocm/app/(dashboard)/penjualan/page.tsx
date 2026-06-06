import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getPenjualanList } from './actions'
import { getPembelianList } from '../pembelian/actions'
import { PenjualanTable } from './penjualan-table'
import { PenjualanFormDialog } from './penjualan-form-dialog'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/format'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PenjualanPage() {
  const [session, penjualanList, pembelianList] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getPenjualanList(),
    getPembelianList(),
  ])

  const isOwner = session?.user.role === 'owner'
  const jumlahLunas = penjualanList.filter((item) => item.statusBayar === 'lunas').length
  const jumlahBelum = penjualanList.length - jumlahLunas

  const totalPenjualan = penjualanList.reduce((s, p) => s + (p.totalBersih ?? 0), 0)
  const totalPpn = penjualanList.reduce((s, p) => {
    const bersih = p.totalBersih ?? 0
    const nilai = p.totalNilai ?? 0
    return s + (nilai > bersih ? nilai - bersih : 0)
  }, 0)
  const estimasiLaba = pembelianList.reduce((s, p) => s + p.keuntungan, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Penjualan</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Kelola invoice dan status pembayaran BGA.
            <span className="text-stone-400"> · {jumlahLunas} lunas · {jumlahBelum} piutang</span>
          </p>
        </div>
        <PenjualanFormDialog>
          <Button size="sm" className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </PenjualanFormDialog>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <div className="surface press-card p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-[#6B7280] mb-1">Total Transaksi</p>
          <p className="text-lg sm:text-2xl font-bold text-stone-900 dark:text-stone-100 num tabular-nums">{penjualanList.length}</p>
          <p className="text-[10px] sm:text-xs text-stone-400 dark:text-[#6B7280] mt-0.5 sm:mt-1">Penjualan tercatat</p>
        </div>
        <div className="surface press-card p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-[#6B7280] mb-1">Total Penjualan</p>
          <p className="text-lg sm:text-2xl font-bold text-stone-900 dark:text-stone-100 num tabular-nums">{formatRupiah(totalPenjualan)}</p>
          <p className="text-[10px] sm:text-xs text-stone-400 dark:text-[#6B7280] mt-0.5 sm:mt-1">Nilai bersih (tanpa pajak)</p>
        </div>
        <div className="surface press-card p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-[#6B7280] mb-1">Total PPN</p>
          <p className="text-lg sm:text-2xl font-bold text-stone-900 dark:text-stone-100 num tabular-nums">{formatRupiah(totalPpn)}</p>
          <p className="text-[10px] sm:text-xs text-stone-400 dark:text-[#6B7280] mt-0.5 sm:mt-1">Selisih PPN-PPH</p>
        </div>
        <div className="surface press-card p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-[#6B7280] mb-1">Estimasi Laba</p>
          <p className="text-lg sm:text-2xl font-bold text-stone-900 dark:text-stone-100 num tabular-nums">{formatRupiah(estimasiLaba)}</p>
          <p className="text-[10px] sm:text-xs text-stone-400 dark:text-[#6B7280] mt-0.5 sm:mt-1">Margin dari pembelian</p>
        </div>
      </div>

      <PenjualanTable penjualanList={penjualanList} isOwner={isOwner} />
    </div>
  )
}
