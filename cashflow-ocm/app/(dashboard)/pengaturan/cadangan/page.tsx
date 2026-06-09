export const dynamic = 'force-dynamic'

import { SettingsClient } from '../settings-client'
import { SettingHeader } from '../_components/setting-header'
import { requireSettingsSession } from '../_components/require-session'

export default async function CadanganPage() {
  const { currentUser } = await requireSettingsSession()
  return (
    <div className="space-y-6 max-w-3xl">
      <SettingHeader
        title="Pencadangan Data"
        description="Cadangkan konfigurasi atau bersihkan sistem keuangan."
      />
      <SettingsClient currentUser={currentUser} initialUsers={[]} section="backup" />
    </div>
  )
}
