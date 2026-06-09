export const dynamic = 'force-dynamic'

import { SettingsClient } from '../settings-client'
import { SettingHeader } from '../_components/setting-header'
import { requireSettingsSession } from '../_components/require-session'

export default async function PerusahaanPage() {
  const { currentUser } = await requireSettingsSession()
  return (
    <div className="space-y-6 max-w-3xl">
      <SettingHeader
        title="Profil Perusahaan"
        description="Data legalitas dan konfigurasi operasional sawit CV OCM."
      />
      <SettingsClient currentUser={currentUser} initialUsers={[]} section="company" />
    </div>
  )
}
