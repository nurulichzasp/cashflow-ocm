export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { getLaporanData } from './actions'
import { LaporanClient } from './laporan-client'

function getDefaultRange() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return {
    dari: `${year}-${month}-01`,
    sampai: `${year}-${month}-${day}`,
  }
}

export default async function LaporanPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  // Laporan keuangan hanya untuk peran berhak finance. getLaporanData juga sudah
  // memblokir; redirect ini hanya agar UX bersih (bukan halaman error).
  if (!hasPermission(session.user.role, 'canViewFinance')) redirect('/pembelian')

  const { dari, sampai } = getDefaultRange()
  const initialData = await getLaporanData(dari, sampai)

  return (
    <div className="space-y-5">
      <LaporanClient initialData={initialData} defaultDari={dari} defaultSampai={sampai} />
    </div>
  )
}
