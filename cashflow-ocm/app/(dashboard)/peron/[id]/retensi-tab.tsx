import { Calculator, ShieldAlert } from 'lucide-react'
import { getKalkulatorContext, getAncamanHistory } from '../retensi-actions'
import { formatTanggal } from '@/lib/format'
import { EmptyState } from '@/components/empty-state'
import { KalkulatorSheet } from '../kesehatan/kalkulator-sheet'

const TINDAKAN_LABEL: Record<string, string> = {
  dipantau: 'Dipantau', dipertahankan: 'Dipertahankan', dibiarkan: 'Dibiarkan',
}

/**
 * Tab "Retensi" di detail peron — eks blok "Retensi & Pertahanan Harga" di
 * /peron/kesehatan/[id] (kalkulator pertahanan + riwayat ancaman).
 * Pemanggil sudah memastikan canViewFinance; server action tetap penjaga utama.
 */
export async function RetensiTab({
  peronId,
  canApply,
  canCreate,
}: {
  peronId: string
  canApply: boolean
  canCreate: boolean
}) {
  const [kalkulatorCtx, ancamanHistory] = await Promise.all([
    getKalkulatorContext(peronId),
    getAncamanHistory(peronId),
  ])

  if (!kalkulatorCtx) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Data retensi tidak tersedia"
        description="Konteks kalkulator untuk peron ini tidak ditemukan."
      />
    )
  }

  return (
    <div className="space-y-2.5">
      <p className="px-1 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">Retensi &amp; Pertahanan Harga</p>

      <div className="surface flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[13px] text-stone-500 dark:text-zinc-400">
            Untung CV <span className="font-semibold text-stone-900 dark:text-zinc-100 tabular-nums">Rp {kalkulatorCtx.peron.keuntunganPerKg.toLocaleString('id-ID')}/kg</span>
            {kalkulatorCtx.volume != null && <> · <span className="tabular-nums">{Math.round(kalkulatorCtx.volume).toLocaleString('id-ID')} kg</span></>}
          </p>
          <p className="mt-0.5 text-xs text-stone-400 dark:text-zinc-500">Ambang loyalitas Rp {kalkulatorCtx.settings.ambang}/kg</p>
        </div>
        <KalkulatorSheet context={kalkulatorCtx} canApply={canApply} canCreate={canCreate}>
          <button className="tactile inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--brand-solid)] px-3.5 text-[13px] font-semibold text-white hover:brightness-110 active:scale-[0.98]">
            <Calculator className="h-4 w-4" /> Hitung pertahanan
          </button>
        </KalkulatorSheet>
      </div>

      {ancamanHistory.length > 0 && (
        <div className="surface divide-y divide-stone-100 dark:divide-white/[0.06]">
          {ancamanHistory.map((a) => (
            <div key={a.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-stone-700 dark:text-zinc-300">
                  {formatTanggal(a.tanggal)} · {a.produk}
                </span>
                <span className="text-xs font-semibold text-stone-500 dark:text-zinc-400">{TINDAKAN_LABEL[a.tindakan] ?? a.tindakan}</span>
              </div>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400 tabular-nums">
                Kompetitor Rp {a.hargaKompetitor.toLocaleString('id-ID')} · acuan Rp {a.hargaAcuanSaat.toLocaleString('id-ID')} · untung CV {a.keuntunganSebelum}
                {a.keuntunganSesudah != null && a.keuntunganSesudah !== a.keuntunganSebelum && <> → {a.keuntunganSesudah}</>}
              </p>
              {a.catatan && <p className="mt-1 text-[13px] text-stone-600 dark:text-zinc-300">{a.catatan}</p>}
              {a.oleh && <p className="mt-1 text-[11px] text-stone-400 dark:text-zinc-500">oleh {a.oleh}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
