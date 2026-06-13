'use client'

import React from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

type Point = { date: string; masuk: number; keluar: number }

const fmt = (v: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    notation: 'compact',
    compactDisplay: 'short',
  }).format(v)

const fmtFull = (v: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(v)

/* Netral: masuk = foreground (tegas), keluar = muted (abu) — dibedakan lewat
   terang + garis putus-putus, bukan warna (selaras palet netral). */
const C_MASUK = 'var(--foreground)'
const C_KELUAR = 'var(--muted-foreground)'
const C_GRID = 'var(--chart-grid)'
const C_AXIS = 'var(--chart-axis)'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-popover border border-border px-3 py-2.5 shadow-xl text-xs">
      <p className="text-muted-foreground mb-2 font-medium">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p
          key={i}
          className="font-semibold num mb-0.5"
          style={{ color: entry.color }}
        >
          {entry.name}: {fmtFull(Number(entry.value ?? 0))}
        </p>
      ))}
    </div>
  )
}

export function CashflowChart({ data }: { data: Point[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="gradMasuk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C_MASUK} stopOpacity={0.18} />
              <stop offset="95%" stopColor={C_MASUK} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradKeluar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C_KELUAR} stopOpacity={0.18} />
              <stop offset="95%" stopColor={C_KELUAR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={C_GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: C_AXIS }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: C_AXIS }}
            tickFormatter={fmt}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="masuk"
            stroke={C_MASUK}
            strokeWidth={2}
            fill="url(#gradMasuk)"
            name="Masuk"
            dot={false}
            activeDot={{ r: 4, fill: C_MASUK }}
          />
          <Area
            type="monotone"
            dataKey="keluar"
            stroke={C_KELUAR}
            strokeWidth={2}
            strokeDasharray="4 3"
            fill="url(#gradKeluar)"
            name="Keluar"
            dot={false}
            activeDot={{ r: 4, fill: C_KELUAR }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default CashflowChart
