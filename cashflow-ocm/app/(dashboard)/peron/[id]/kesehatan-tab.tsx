import { AlertTriangle, HeartPulse } from 'lucide-react'
import { getPeronHealthDetail } from '../health-actions'
import { STATUS_META, pct, deltaPct } from '@/lib/peron-health/status-meta'
import { formatTanggal } from '@/lib/format'
import { EmptyState } from '@/components/empty-state'
import { ShareChart } from '../kesehatan/[id]/share-chart'
import { FollowupSheet } from '../kesehatan/[id]/followup-sheet'
import { ArchiveButton } from '../kesehatan/[id]/archive-button'
import { RefreshButton } from '../kesehatan/refresh-button'

const REASON_LABEL: Record<string, string> = {
  harga_kalah: 'Harga kalah', pindah_cv: 'Pindah CV', masalah_operasional: 'Masalah operasional',
  memang_musim: 'Memang musim', lainnya: 'Lainnya',
}
const OUTCOME_LABEL: Record<string, string> = {
  kembali_normal: 'Kembali normal', masih_pantau: 'Masih pantau', hilang: 'Hilang',
}

/**
 * Tab "Kesehatan" di detail peron — eks isi /peron/kesehatan/[id]
 * (verdict + grafik share + statistik + riwayat tindak lanjut + aksi).
 * Peron tanpa data health TIDAK 404 — tampil empty state.
 */
export async function KesehatanTab({
  peronId,
  canFollowup,
  canArchive,
}: {
  peronId: string
  canFollowup: boolean
  canArchive: boolean
}) {
  const detail = await getPeronHealthDetail(peronId)

  // Belum pernah di-snapshot → empty state yang layak, bukan 404.
  if (!detail || (!detail.health && detail.snapshots.length === 0)) {
    return (
      <EmptyState
        icon={HeartPulse}
        title="Belum ada data kesehatan"
        description="Peron ini belum punya snapshot mingguan. Data muncul setelah pembaruan kesehatan berikutnya."
        action={canArchive ? <RefreshButton /> : undefined}
      />
    )
  }

  const h = detail.health
  const status = h?.status ?? 'data_kurang'
  const meta = STATUS_META[status]
  const chartData = detail.snapshots.map((s) => ({
    week: s.weekStart,
    sharePct: s.share * 100,
    kg: Math.round(s.totalKg),
    operational: s.isOperationalWeek,
  }))

  return (
    <div className="space-y-5">
      {/* Status */}
      <div className="flex items-center gap-2.5 px-1">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.dot }} />
        <span className={`text-sm font-semibold ${meta.text}`}>{meta.label}</span>
      </div>

      {/* Verdict */}
      {h?.seasonVerdict && status !== 'data_kurang' && (
        <div className="surface flex items-start gap-2.5 p-4">
          <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0" style={{ color: meta.dot }} strokeWidth={2} />
          <p className="text-[13px] leading-relaxed text-stone-700 dark:text-zinc-300">
            {h.seasonVerdict === 'lari'
              ? <><b className="font-semibold">Turun sendirian</b> — kemungkinan volume lari ke pihak lain. Segera tindak lanjut.</>
              : <><b className="font-semibold">Turun musiman</b> — peron lain juga turun. Pantau, belum tentu lari.</>}
          </p>
        </div>
      )}

      {/* Grafik */}
      <div className="surface p-4">
        <ShareChart data={chartData} baseSharePct={(h?.shareBase ?? 0) * 100} />
      </div>

      {/* Statistik */}
      {h && (
        <div className="surface divide-y divide-stone-100 dark:divide-white/[0.06]">
          <Row label="Share sekarang" value={pct(h.shareCurrent)} />
          <Row label="Baseline (biasa)" value={pct(h.shareBase)} />
          <Row label="Perubahan" value={h.shareBase > 0 ? deltaPct(h.shareDelta) : '—'} valueClass={h.shareDelta < 0 ? meta.text : undefined} />
          <Row label="Jeda setor biasa" value={h.typicalGap > 0 ? `${h.typicalGap.toFixed(0)} hari` : '—'} />
          <Row label="Terakhir setor" value={h.lastSetorDate ? `${formatTanggal(h.lastSetorDate)} · ${h.daysSinceLast} hr lalu` : '—'} />
        </div>
      )}

      {/* Riwayat tindak lanjut */}
      {detail.followups.length > 0 && (
        <section className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">Riwayat Tindak Lanjut</p>
          <div className="surface divide-y divide-stone-100 dark:divide-white/[0.06]">
            {detail.followups.map((f) => (
              <div key={f.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-stone-700 dark:text-zinc-300">
                    {f.createdAt ? formatTanggal(new Date(f.createdAt)) : ''}
                    {f.contacted ? ' · dihubungi' : ' · belum dihubungi'}
                  </span>
                  {f.outcome && <span className="text-xs text-stone-400 dark:text-zinc-500">{OUTCOME_LABEL[f.outcome]}</span>}
                </div>
                {f.reason && <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400">{REASON_LABEL[f.reason]}</p>}
                {f.note && <p className="mt-1 text-[13px] text-stone-600 dark:text-zinc-300">{f.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Aksi */}
      {(canFollowup || canArchive) && (
        <div className="space-y-1.5">
          {canFollowup && <FollowupSheet peronId={peronId} status={status} />}
          {canArchive && <ArchiveButton peronId={peronId} />}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[13px] text-stone-500 dark:text-zinc-400">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${valueClass ?? 'text-stone-900 dark:text-zinc-100'}`}>{value}</span>
    </div>
  )
}
