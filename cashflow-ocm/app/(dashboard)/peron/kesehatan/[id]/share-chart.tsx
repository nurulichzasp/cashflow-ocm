'use client'

import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'

type Point = { week: string; sharePct: number; kg: number; operational: boolean }

/**
 * Grafik keputusan: garis SHARE% per minggu (metrik utama) + bar kg (konteks).
 * Minggu non-operasional (libur) ditandai bar abu pudar agar tak salah dibaca.
 */
export function ShareChart({ data, baseSharePct }: { data: Point[]; baseSharePct: number }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-stone-400 dark:text-zinc-500">Belum ada data mingguan.</p>
  }
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">Share % per minggu</p>
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -22 }}>
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} tickFormatter={(w) => w.slice(5)} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} width={36} tickFormatter={(v) => `${v}%`} />
            {baseSharePct > 0 && (
              <ReferenceLine y={baseSharePct} stroke="var(--chart-axis)" strokeDasharray="3 3" />
            )}
            <Tooltip
              contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
              labelFormatter={(w) => `Minggu ${w}`}
              formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Share']}
            />
            <Line type="monotone" dataKey="sharePct" stroke="var(--brand)" strokeWidth={2.25} dot={{ r: 2.5, fill: 'var(--brand)' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">Volume kg per minggu</p>
        <ResponsiveContainer width="100%" height={90}>
          <ComposedChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: -22 }}>
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} tickFormatter={(w) => w.slice(5)} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} width={36} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : `${v}`} />
            <Tooltip
              contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
              labelFormatter={(w) => `Minggu ${w}`}
              formatter={(v) => [`${Number(v).toLocaleString('id-ID')} kg`, 'Volume']}
            />
            <Bar dataKey="kg" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.operational ? 'var(--chart-2)' : 'var(--border)'} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
