import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getPenjualanList } from './actions'
import { getEstimasiLaba } from '../pembelian/actions'
import { PenjualanTable } from './penjualan-table'
import { PenjualanFormDialog } from './penjualan-form-dialog'
import { FloatingFab } from '@/components/fab'

export const dynamic = 'force-dynamic'

export default async function PenjualanPage() {
  const [session, penjualanList, estimasiLaba] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getPenjualanList(),
    getEstimasiLaba(),
  ])

  const isOwner = session?.user.role === 'owner'

  // Hero (Total Penjualan/Transaksi/PPN/Margin) kini IKUT filter → ada di PenjualanTable.
  return (
    <div className="space-y-5">
      <PenjualanFormDialog><FloatingFab /></PenjualanFormDialog>
      <PenjualanTable penjualanList={penjualanList} isOwner={isOwner} estimasiLaba={estimasiLaba} />
    </div>
  )
}
