import { useEffect, useState, useCallback } from 'react'
import { useFormatDate } from '@/hooks/use-format-date'
import type { HistoryPoint, MonitoringData } from './types'

interface MonitoringHistoryItem {
  createdAt: string
  healthData?: {
    database?: { latency?: number }
    redis?: { latency?: number }
  }
  metricsData?: {
    process?: {
      cpuUsagePercent?: number
      memoryUsage?: { percentage?: number }
    }
    cache?: { hitRate?: number }
  }
}

const REFRESH_INTERVAL_MS = 10_000
const HISTORY_LIMIT = 50

/**
 * Pulls /api/admin/monitoring/{data,history} on mount, optionally
 * polling every 10s. The `lastUpdate` timestamp is exposed so the
 * page header can show a "X seconds ago" indicator.
 */
export function useMonitoringData(autoRefresh: boolean) {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const formatDate = useFormatDate()

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/monitoring/data')
      const json = (await response.json()) as MonitoringData
      setData(json)
      setLastUpdate(new Date())
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch monitoring data', error)
      setLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/monitoring/history')
      if (!response.ok) {
        console.error('Failed to fetch monitoring history', response.status)
        return
      }
      const json = (await response.json()) as { history?: MonitoringHistoryItem[] }
      if (!json.history || !Array.isArray(json.history)) {
        setHistory([])
        return
      }

      const formatted: HistoryPoint[] = json.history
        .slice(0, HISTORY_LIMIT)
        .reverse()
        .map((item) => ({
          time: formatDate(item.createdAt, { hour: '2-digit', minute: '2-digit' }),
          database: item.healthData?.database?.latency || 0,
          redis: item.healthData?.redis?.latency || 0,
          cpu: item.metricsData?.process?.cpuUsagePercent || 0,
          memory: item.metricsData?.process?.memoryUsage?.percentage || 0,
          cacheHitRate: item.metricsData?.cache?.hitRate || 0,
        }))
      setHistory(formatted)
    } catch (error) {
      console.error('Failed to fetch monitoring history', error)
      setHistory([])
    }
  }, [formatDate])

  useEffect(() => {
    fetchData()
    fetchHistory()

    if (autoRefresh) {
      const interval = setInterval(fetchData, REFRESH_INTERVAL_MS)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, fetchData, fetchHistory])

  const refresh = useCallback(() => {
    fetchData()
    fetchHistory()
  }, [fetchData, fetchHistory])

  return { data, history, loading, lastUpdate, refresh }
}
