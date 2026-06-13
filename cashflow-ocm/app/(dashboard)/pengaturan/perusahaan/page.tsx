export const dynamic = 'force-dynamic'

import { SettingsClient } from '../settings-client'
import { SettingHeader } from '../_components/setting-header'
import { requireSettingsSession } from '../_components/require-session'
import { getAppSettings } from '../actions'

export default async function PerusahaanPage() {
  const { currentUser } = await requireSettingsSession()
  // Nilai awal dari server → form langsung benar tanpa flash default→asli.
  const s = await getAppSettings([
    'company_name',
    'company_address',
    'company_phone',
    'company_email',
    'company_npwp',
    'company_large_transaction_threshold',
  ])
  return (
    <div className="space-y-6 max-w-3xl">
      <SettingHeader
        title="Profil Perusahaan"
        description="Data legalitas dan konfigurasi operasional sawit CV OCM."
      />
      <SettingsClient
        currentUser={currentUser}
        initialUsers={[]}
        section="company"
        initialCompany={{
          name: s.company_name,
          address: s.company_address,
          phone: s.company_phone,
          email: s.company_email,
          npwp: s.company_npwp,
          threshold: s.company_large_transaction_threshold,
        }}
      />
    </div>
  )
}
