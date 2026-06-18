export const dynamic = 'force-dynamic'

import { SettingsClient } from '../settings-client'
import { SettingHeader } from '../_components/setting-header'
import { requireSettingsSession } from '../_components/require-session'

export default async function PrinterPage() {
  const { currentUser } = await requireSettingsSession()
  return (
    <div className="space-y-6 max-w-3xl">
      <SettingHeader
        title="Printer Kasir"
        description="Pengaturan struk thermal (58/80mm) untuk cetak tiket."
      />
      <SettingsClient currentUser={currentUser} initialUsers={[]} section="printer" />
    </div>
  )
}
