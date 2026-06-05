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

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-[#272727] border border-[#383838] px-3 py-2.5 shadow-xl text-xs">
      <p className="text-[#8A7060] mb-2 font-medium">{label}</p>
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
              <stop offset="5%" stopColor="#16A34A" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradKeluar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#DC2626" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E7E5E4" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#A8A29E' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#A8A29E' }}
            tickFormatter={fmt}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="masuk"
            stroke="#16A34A"
            strokeWidth={2}
            fill="url(#gradMasuk)"
            name="Masuk"
            dot={false}
            activeDot={{ r: 4, fill: '#16A34A' }}
          />
          <Area
            type="monotone"
            dataKey="keluar"
            stroke="#DC2626"
            strokeWidth={2}
            fill="url(#gradKeluar)"
            name="Keluar"
            dot={false}
            activeDot={{ r: 4, fill: '#DC2626' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default CashflowChart
