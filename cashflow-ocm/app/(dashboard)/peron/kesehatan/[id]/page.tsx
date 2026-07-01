export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { ChevronLeft, AlertTriangle } from 'lucide-react'
import { getPeronHealthDetail } from '../../health-actions'
import { getKalkulatorContext, getAncamanHistory } from '../../retensi-actions'
import { STATUS_META, pct, deltaPct } from '@/lib/peron-health/status-meta'
import { formatTanggal } from '@/lib/format'
import { Calculator } from 'lucide-react'
import { ShareChart } from './share-chart'
import { FollowupSheet } from './followup-sheet'
import { ArchiveButton } from './archive-button'
import { KalkulatorSheet } from '../kalkulator-sheet'

const REASON_LABEL: Record<string, string> = {
  harga_kalah: 'Harga kalah', pindah_cv: 'Pindah CV', masalah_operasional: 'Masalah operasional',
  memang_musim: 'Memang musim', lainnya: 'Lainnya',
}
const OUTCOME_LABEL: Record<string, string> = {
  kembali_normal: 'Kembali normal', masih_pantau: 'Masih pantau', hilang: 'Hilang',
}
const TINDAKAN_LABEL: Record<string, string> = {
  dipantau: 'Dipantau', dipertahankan: 'Dipertahankan', dibiarkan: 'Dibiarkan',
}

export default async function PeronHealthDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  const { id } = await params

  // Gating UI (server tetap penjaga utama via requirePermission). Tindak lanjut =
  // operasional (canCreate); arsip = kurasi/manajemen (canEdit) (R2).
  const canFollowup = hasPermission(session.user.role, 'canCreate')
  const canArchive = hasPermission(session.user.role, 'canEdit')
  const canViewFinance = hasPermission(session.user.role, 'canViewFinance')
  const canApply = session.user.role === 'owner'

  const [detail, kalkulatorCtx, ancamanHistory] = await Promise.all([
    getPeronHealthDetail(id),
    canViewFinance ? getKalkulatorContext(id) : Promise.resolve(null),
    canViewFinance ? getAncamanHistory(id) : Promise.resolve([]),
  ])
  if (!detail) notFound()

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
    <div className="space-y-5 pt-1">
      {/* Back + judul */}
      <div className="space-y-3">
        <Link href="/peron/kesehatan" className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          <ChevronLeft className="h-4 w-4" /> Kesehatan Peron
        </Link>
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.dot }} />
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-zinc-50">{detail.nama}</h1>
          <span className={`text-sm font-semibold ${meta.text}`}>{meta.label}</span>
        </div>
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

      {/* Retensi & Pertahanan Harga */}
      {canViewFinance && kalkulatorCtx && (
        <section className="space-y-2.5">
          <p className="px-1 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">Retensi &amp; Pertahanan Harga</p>

          <div className="surface flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-[13px] text-stone-500 dark:text-zinc-400">
                Untung CV <span className="font-semibold text-stone-900 dark:text-zinc-100 tabular-nums">Rp {kalkulatorCtx.peron.keuntunganPerKg.toLocaleString('id-ID')}/kg</span>
                {kalkulatorCtx.volume != null && <> · <span className="tabular-nums">{Math.round(kalkulatorCtx.volume).toLocaleString('id-ID')} kg</span></>}
              </p>
              <p className="mt-0.5 text-xs text-stone-400 dark:text-zinc-500">Ambang loyalitas Rp {kalkulatorCtx.settings.ambang}/kg</p>
            </div>
            <KalkulatorSheet context={kalkulatorCtx} canApply={canApply} canCreate={canFollowup}>
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
        </section>
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
          {canFollowup && <FollowupSheet peronId={id} status={status} />}
          {canArchive && <ArchiveButton peronId={id} />}
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
