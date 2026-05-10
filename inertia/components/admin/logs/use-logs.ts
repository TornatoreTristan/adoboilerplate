import { useEffect, useState, useCallback } from 'react'
import type { Log, LogFilters, LogStats } from './types'

const PER_PAGE = 50

/**
 * Fetches `/api/admin/logs/list` and `/api/admin/logs/stats`. Re-runs on
 * filter/page change. Exposes a `refresh` function the page header
 * binds to a refresh button.
 */
export function useLogs(filters: LogFilters, page: number) {
  const [logs, setLogs] = useState<Log[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: PER_PAGE.toString(),
        ...(filters.level && filters.level !== 'all' && { level: filters.level }),
        ...(filters.search && { search: filters.search }),
        ...(filters.method && filters.method !== 'all' && { method: filters.method }),
      })
      const response = await fetch(`/api/admin/logs/list?${params}`)
      const json = (await response.json()) as { data: Log[]; total: number }
      setLogs(json.data)
      setTotal(json.total)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch logs:', error)
      setLoading(false)
    }
  }, [filters, page])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/logs/stats')
      const json = (await response.json()) as LogStats
      setStats(json)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [fetchLogs, fetchStats])

  return {
    logs,
    stats,
    total,
    loading,
    perPage: PER_PAGE,
    refresh: () => {
      fetchLogs()
      fetchStats()
    },
  }
}
