'use client'

import { useState, useEffect, useCallback } from 'react'

export interface DashboardMetrics {
  totalSaldo: number
  totalDpPeron: number
  piutangBga: number
  totalModalBerputar: number
  totalPenjualanLunas: number
  estimasiLaba: number
  pembelianHariIni: number
  penjualanHariIni: number
  biayaHariIni: number
  akunSaldo: Array<{
    id: string
    nama: string
    tipe: string
    saldo: number
  }>
  timestamp: string
}

const DEFAULT_POLL_INTERVAL = 30000 // 30 seconds

export function useDashboardMetrics(enabled = true, pollInterval = DEFAULT_POLL_INTERVAL) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/metrics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`)
      }

      const data = await response.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Failed to fetch dashboard metrics:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    // Fetch immediately
    fetchMetrics()

    // Set up polling interval
    const interval = setInterval(fetchMetrics, pollInterval)

    return () => clearInterval(interval)
  }, [enabled, pollInterval, fetchMetrics])

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics,
  }
}
