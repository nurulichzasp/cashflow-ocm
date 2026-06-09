export const dynamic = 'force-dynamic'

import { SettingsClient } from '../settings-client'
import { SettingHeader } from '../_components/setting-header'
import { requireSettingsSession } from '../_components/require-session'

export default async function TampilanPage() {
  const { currentUser } = await requireSettingsSession()
  return (
    <div className="space-y-6 max-w-3xl">
      <SettingHeader
        title="Tampilan & Tema"
        description="Pilih tema tampilan aplikasi yang paling nyaman untuk Anda."
      />
      <SettingsClient currentUser={currentUser} initialUsers={[]} section="theme" />
    </div>
  )
}
