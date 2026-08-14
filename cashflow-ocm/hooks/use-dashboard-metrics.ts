'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

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
const METRICS_TIMEOUT_MS = 15000

export function useDashboardMetrics(enabled = true, pollInterval = DEFAULT_POLL_INTERVAL) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const activeRequest = useRef<AbortController | null>(null)

  const fetchMetrics = useCallback(async () => {
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, METRICS_TIMEOUT_MS)

    try {
      const response = await fetch('/api/metrics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`)
      }

      const data = await response.json() as DashboardMetrics
      if (activeRequest.current === controller) {
        setMetrics(data)
        setError(null)
      }
    } catch (err) {
      if (activeRequest.current !== controller) return
      if (timedOut) {
        setError('Pengambilan ringkasan melewati batas waktu')
      } else if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('Failed to fetch dashboard metrics:', err)
      }
    } finally {
      clearTimeout(timeout)
      if (activeRequest.current === controller) {
        activeRequest.current = null
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    // Fetch segera setelah commit; frame dibatalkan saat Strict Mode me-remount.
    const frame = requestAnimationFrame(() => { void fetchMetrics() })

    // Set up polling interval
    const interval = setInterval(fetchMetrics, pollInterval)

    return () => {
      cancelAnimationFrame(frame)
      clearInterval(interval)
      activeRequest.current?.abort()
    }
  }, [enabled, pollInterval, fetchMetrics])

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics,
  }
}
