export const dynamic = 'force-dynamic'

import { SettingsClient } from '../settings-client'
import { SettingHeader } from '../_components/setting-header'
import { requireSettingsSession } from '../_components/require-session'
import { getAppSettings } from '../actions'

export default async function PajakPage() {
  const { currentUser } = await requireSettingsSession()
  // Nilai awal dari server → tarif pajak & modal awal langsung benar tanpa flash.
  const s = await getAppSettings([
    'tax_tarif_ppn',
    'tax_tarif_pph_badan',
    'tax_nominal_pph25',
    'neraca_modal_awal',
  ])
  return (
    <div className="space-y-6 max-w-3xl">
      <SettingHeader
        title="Pajak & Neraca"
        description="Atur tarif pajak dan modal awal untuk laporan keuangan."
      />
      <SettingsClient
        currentUser={currentUser}
        initialUsers={[]}
        section="pajak"
        initialTax={{
          tarifPpn: s.tax_tarif_ppn,
          tarifPphBadan: s.tax_tarif_pph_badan,
          nominalPph25: s.tax_nominal_pph25,
          modalAwal: s.neraca_modal_awal,
        }}
      />
    </div>
  )
}
