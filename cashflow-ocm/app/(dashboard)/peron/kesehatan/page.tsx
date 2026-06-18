export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ChevronRight, HeartPulse } from 'lucide-react'
import { getPeronHealthList } from '../health-actions'
import { STATUS_META, pct, deltaPct } from '@/lib/peron-health/status-meta'
import { RefreshButton } from './refresh-button'

function relativeTime(ts: Date | null): string {
  if (!ts) return 'belum pernah'
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h} jam lalu`
  return `${Math.floor(h / 24)} hari lalu`
}

type Item = Awaited<ReturnType<typeof getPeronHealthList>>[number]

function HealthCard({ item }: { item: Item }) {
  const meta = STATUS_META[item.status]
  return (
    <Link
      href={`/peron/kesehatan/${item.peronId}`}
      className="surface row-press flex items-center gap-3 p-4"
    >
      <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: meta.dot }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold text-stone-900 dark:text-zinc-100">{item.nama}</p>
          <span className={`shrink-0 text-xs font-semibold ${meta.text}`}>{meta.label}</span>
        </div>
        {item.shareBase > 0 ? (
          <p className="mt-0.5 text-[13px] text-stone-500 dark:text-zinc-400">
            Share {pct(item.shareCurrent)} <span className="text-stone-400 dark:text-zinc-500">(biasa {pct(item.shareBase)})</span>
            {item.shareDelta < 0 && <span className={`ml-1.5 font-semibold ${meta.text}`}>{deltaPct(item.shareDelta)}</span>}
          </p>
        ) : (
          <p className="mt-0.5 text-[13px] text-stone-400 dark:text-zinc-500">Belum cukup riwayat</p>
        )}
        {(item.status === 'kritis' || item.status === 'perhatian') && (
          <p className="mt-0.5 text-[12px] text-stone-400 dark:text-zinc-500">
            {item.daysSinceLast >= 1 && item.daysSinceLast < 9999 ? `${item.daysSinceLast} hari tanpa setor` : ''}
            {item.seasonVerdict === 'lari' ? ' · kemungkinan lari' : item.seasonVerdict === 'musim' ? ' · turun musiman' : ''}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-stone-300 dark:text-zinc-600" />
    </Link>
  )
}

export default async function KesehatanPeronPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const list = await getPeronHealthList()
  const kritis = list.filter((i) => i.status === 'kritis')
  const perhatian = list.filter((i) => i.status === 'perhatian')
  const sehat = list.filter((i) => i.status === 'normal')
  const dataKurang = list.filter((i) => i.status === 'data_kurang')
  const perluTindak = [...kritis, ...perhatian]
  const lastUpdated = list.reduce<Date | null>((acc, i) => {
    const t = i.updatedAt ? new Date(i.updatedAt) : null
    return t && (!acc || t > acc) ? t : acc
  }, null)

  return (
    <div className="space-y-5 pt-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-zinc-50">Kesehatan Peron</h1>
          <p className="mt-0.5 text-[13px] text-stone-400 dark:text-zinc-500">Diperbarui {relativeTime(lastUpdated)}</p>
        </div>
        <RefreshButton />
      </div>

      {/* Ringkasan badge */}
      <div className="flex gap-2.5">
        <div className="surface flex-1 px-3.5 py-3">
          <p className="text-[22px] font-bold tabular-nums text-crit">{kritis.length}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:text-zinc-500">Kritis</p>
        </div>
        <div className="surface flex-1 px-3.5 py-3">
          <p className="text-[22px] font-bold tabular-nums text-warn">{perhatian.length}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:text-zinc-500">Perhatian</p>
        </div>
        <div className="surface flex-1 px-3.5 py-3">
          <p className="text-[22px] font-bold tabular-nums text-stone-700 dark:text-zinc-300">{sehat.length}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:text-zinc-500">Sehat</p>
        </div>
      </div>

      {/* Perlu Ditindaklanjuti */}
      {perluTindak.length > 0 ? (
        <section className="space-y-2.5">
          <p className="px-1 text-[12px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
            Perlu Ditindaklanjuti
          </p>
          {perluTindak.map((i) => <HealthCard key={i.peronId} item={i} />)}
        </section>
      ) : (
        <div className="surface flex flex-col items-center gap-2 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 dark:bg-white/[0.06]">
            <HeartPulse className="h-6 w-6 text-[#10B981]" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-semibold text-stone-800 dark:text-zinc-200">Semua peron sehat</p>
          <p className="max-w-[30ch] text-[13px] text-stone-500 dark:text-zinc-500">
            Tidak ada peron yang perlu ditindaklanjuti saat ini.
          </p>
        </div>
      )}

      {/* Semua peron (collapsible) */}
      {(sehat.length > 0 || dataKurang.length > 0) && (
        <details className="group">
          <summary className="surface row-press flex cursor-pointer list-none items-center justify-between p-4 [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-medium text-stone-700 dark:text-zinc-300">
              Semua Peron ({sehat.length + dataKurang.length})
            </span>
            <ChevronRight className="h-4 w-4 text-stone-400 transition-transform group-open:rotate-90 dark:text-zinc-500" />
          </summary>
          <div className="mt-2.5 space-y-2.5">
            {[...sehat, ...dataKurang].map((i) => <HealthCard key={i.peronId} item={i} />)}
          </div>
        </details>
      )}
    </div>
  )
}
