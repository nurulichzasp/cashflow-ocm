export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { SettingHeader } from '../_components/setting-header'
import { requireSettingsSession } from '../_components/require-session'
import { getRetensiSettings } from '../../peron/retensi-actions'
import { RetensiSettingsForm } from './retensi-settings-form'

export default async function RetensiSettingsPage() {
  const { currentUser } = await requireSettingsSession()
  if (currentUser.role !== 'owner') redirect('/pengaturan')

  const settings = await getRetensiSettings()

  return (
    <div className="space-y-6 max-w-3xl">
      <SettingHeader
        title="Retensi & Pertahanan Harga"
        description="Ambang loyalitas & batas bawah margin untuk kalkulator pertahanan peron."
      />
      <RetensiSettingsForm initial={settings} />
    </div>
  )
}
