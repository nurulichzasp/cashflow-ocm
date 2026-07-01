'use client'

import { StatusPill } from '@/components/ui/status-pill'
import { formatCompact, formatRupiah } from '@/lib/format'
import { ShieldAlert, Calculator } from 'lucide-react'
import { KalkulatorSheet } from './kalkulator-sheet'
import type { RetensiCockpit } from '../retensi-actions'

interface Props {
  cockpit: RetensiCockpit
  canApply: boolean
  canCreate: boolean
}

export function RetensiSection({ cockpit, canApply, canCreate }: Props) {
  const { rows, settings, acuanMap } = cockpit

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
          Retensi &amp; Pertahanan Harga
        </p>
        <span className="text-[11px] text-stone-400 dark:text-zinc-500">ambang Rp {settings.ambang}/kg</span>
      </div>

      {rows.length === 0 ? (
        <div className="surface flex flex-col items-center gap-2 py-8 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 dark:bg-white/[0.06]">
            <ShieldAlert className="h-5 w-5 text-[#10B981]" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-semibold text-stone-800 dark:text-zinc-200">Tak ada peron berisiko</p>
          <p className="max-w-[32ch] text-[13px] text-stone-500 dark:text-zinc-500">
            Belum ada peron perhatian/kritis atau ancaman terbuka. Kalkulator tersedia per peron di halaman detailnya.
          </p>
        </div>
      ) : (
        rows.map((r) => (
          <div key={r.peronId} className="surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate font-semibold text-stone-900 dark:text-zinc-100">{r.nama}</p>
                  {r.healthStatus && (
                    <StatusPill tone={r.healthStatus === 'kritis' ? 'crit' : 'warn'}>
                      {r.healthStatus === 'kritis' ? 'Kritis' : 'Perhatian'}
                    </StatusPill>
                  )}
                  {r.hasOpenAncaman && <StatusPill tone="crit">Terancam</StatusPill>}
                </div>
                <p className="mt-1 text-[13px] text-stone-500 dark:text-zinc-400">
                  Untung CV <span className="font-medium text-stone-800 dark:text-zinc-200 tabular-nums">Rp {r.keuntunganPerKg.toLocaleString('id-ID')}/kg</span>
                  {r.volume != null && <> · <span className="tabular-nums">{Math.round(r.volume).toLocaleString('id-ID')} kg</span></>}
                </p>
                {r.latestAncaman && (
                  <p className="mt-0.5 text-xs text-stone-400 dark:text-zinc-500">
                    Kompetitor Rp {r.latestAncaman.hargaKompetitor.toLocaleString('id-ID')} · gap {formatRupiah(r.latestAncaman.gap)}/kg ({r.latestAncaman.produk})
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] text-stone-400 dark:text-zinc-500">laba berisiko</p>
                <p className="text-sm font-bold tabular-nums text-stone-900 dark:text-zinc-100">
                  {r.labaRisiko != null ? formatCompact(r.labaRisiko) : '—'}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <KalkulatorSheet
                context={{
                  peron: { id: r.peronId, nama: r.nama, keuntunganPerKg: r.keuntunganPerKg },
                  isUmum: false,
                  settings,
                  acuanMap,
                  volume: r.volume,
                }}
                canApply={canApply}
                canCreate={canCreate}
              >
                <button className="tactile inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-[13px] font-semibold text-stone-700 hover:bg-stone-50 active:scale-[0.98] dark:border-border dark:text-zinc-200 dark:hover:bg-white/[0.04]">
                  <Calculator className="h-4 w-4" /> Hitung pertahanan
                </button>
              </KalkulatorSheet>
            </div>
          </div>
        ))
      )}
    </section>
  )
}
