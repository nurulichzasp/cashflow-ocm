export const dynamic = 'force-dynamic'

import { SettingsClient } from '../settings-client'
import { SettingHeader } from '../_components/setting-header'
import { requireSettingsSession } from '../_components/require-session'

export default async function PajakPage() {
  const { currentUser } = await requireSettingsSession()
  return (
    <div className="space-y-6 max-w-3xl">
      <SettingHeader
        title="Pajak & Neraca"
        description="Atur tarif pajak dan modal awal untuk laporan keuangan."
      />
      <SettingsClient currentUser={currentUser} initialUsers={[]} section="pajak" />
    </div>
  )
}
