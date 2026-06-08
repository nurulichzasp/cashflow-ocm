'use client'

import React from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'

type Slice = { name: string; value: number }

/* Palette Claude — biru, oranye, abu, abu gelap */
const COLORS = ['#3B82F6', '#8B8680', '#9CA3AF', '#6B7280']

const fmtFull = (v: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(v)

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="rounded-lg bg-[#28282B] border border-white/10 px-3 py-2.5 shadow-xl text-xs">
      <p className="text-[#9CA3AF] mb-1">{entry.name}</p>
      <p className="font-semibold num" style={{ color: entry.payload.fill }}>
        {fmtFull(Number(entry.value ?? 0))}
      </p>
    </div>
  )
}

function CustomLegend({ data }: { data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="mt-3 space-y-1.5">
      {data.map((item, i) => {
        const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0'
        return (
          <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="text-stone-600 truncate">{item.name}</span>
            </div>
            <span className="text-stone-500 num shrink-0">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

export function CompositionChart({ data }: { data: Slice[] }) {
  const hasData = data.some((d) => d.value > 0)

  return (
    <div className="w-full">
      {!hasData ? (
        <div className="h-56 flex items-center justify-center text-sm text-stone-400">
          Belum ada data
        </div>
      ) : (
        <>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={72}
                  innerRadius={36}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <CustomLegend data={data} />
        </>
      )}
    </div>
  )
}

export default CompositionChart
