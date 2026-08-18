import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getPenjualanList, getPenjualanStats } from './actions'
import { getEstimasiLaba } from '../pembelian/actions'
import { PenjualanTable } from './penjualan-table'
import { PenjualanFormDialog } from './penjualan-form-dialog'
import { FloatingFab } from '@/components/fab'
import { hasUserPermission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export default async function PenjualanPage() {
  const [session, penjualanList, stats, estimasiLaba] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getPenjualanList(),
    getPenjualanStats(),
    getEstimasiLaba(),
  ])

  const isOwner = (session?.user.role ?? '').trim().toLowerCase() === 'owner'
  const canCreate = session ? hasUserPermission(session.user, 'canCreate', 'penjualan') : false
  const canEdit = session ? hasUserPermission(session.user, 'canEdit', 'penjualan') : false

  // Hero (Total Penjualan/Transaksi/PPN/Margin) kini IKUT filter → ada di PenjualanTable.
  return (
    <div className="space-y-5">
      {canCreate && <PenjualanFormDialog canManagePrah={isOwner}><FloatingFab /></PenjualanFormDialog>}
      <PenjualanTable penjualanList={penjualanList} stats={stats} isOwner={isOwner} canEdit={canEdit} estimasiLaba={estimasiLaba} />
    </div>
  )
}
