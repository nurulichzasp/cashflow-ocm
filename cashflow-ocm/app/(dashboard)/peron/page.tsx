import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { SegmentedNav, type SegmentedNavItem } from '@/components/ui/segmented-nav'
import { DaftarView } from './daftar-view'
import { KesehatanView } from './kesehatan-view'
import { RetensiView } from './retensi-view'

export const dynamic = 'force-dynamic'

type View = 'daftar' | 'kesehatan' | 'retensi'

/**
 * Hub Peron — satu halaman bertab (?view=) yang menyatukan Daftar,
 * Kesehatan (eks /peron/kesehatan), dan Retensi. Segmen dipilih via
 * searchParam agar tiap segmen server-rendered & di-fetch on demand.
 */
export default async function PeronPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const [{ view: rawView }, session] = await Promise.all([
    searchParams,
    auth.api.getSession({ headers: await headers() }),
  ])
  if (!session) redirect('/login')

  const isOwner = session.user.role === 'owner'
  // Retensi = data margin/finansial → hanya canViewFinance (kasir tak lihat).
  const canViewFinance = hasPermission(session.user.role, 'canViewFinance')
  const canCreate = hasPermission(session.user.role, 'canCreate')

  const view: View =
    rawView === 'kesehatan' ? 'kesehatan' : rawView === 'retensi' && canViewFinance ? 'retensi' : 'daftar'

  const segments: SegmentedNavItem[] = [
    { key: 'daftar', label: 'Daftar', href: '/peron' },
    { key: 'kesehatan', label: 'Kesehatan', href: '/peron?view=kesehatan' },
    ...(canViewFinance ? [{ key: 'retensi', label: 'Retensi', href: '/peron?view=retensi' }] : []),
  ]

  return (
    <div className="space-y-5">
      <SegmentedNav items={segments} activeKey={view} ariaLabel="Bagian Peron" />

      {view === 'daftar' && <DaftarView isOwner={isOwner} />}
      {view === 'kesehatan' && <KesehatanView />}
      {view === 'retensi' && <RetensiView canApply={isOwner} canCreate={canCreate} />}
    </div>
  )
}
