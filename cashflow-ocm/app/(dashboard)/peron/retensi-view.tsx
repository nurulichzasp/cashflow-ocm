import { getRetentionCockpit } from './retensi-actions'
import { RetensiSection } from './kesehatan/retensi-section'

/**
 * Segmen "Retensi" — cockpit Retensi & Pertahanan Harga (komponen existing).
 * Pemanggil (hub /peron) sudah memastikan canViewFinance sebelum merender;
 * server action-nya sendiri tetap requirePermission('canViewFinance').
 */
export async function RetensiView({ canApply, canCreate }: { canApply: boolean; canCreate: boolean }) {
  const cockpit = await getRetentionCockpit()
  return <RetensiSection cockpit={cockpit} canApply={canApply} canCreate={canCreate} />
}
