export type HealthStatus = 'ok' | 'degraded' | 'down'

export interface HealthCheck {
  status: HealthStatus
  latency?: number
  details?: Record<string, unknown>
  error?: string
}

export interface ProcessMetrics {
  cpuUsagePercent: number
  memoryUsage: {
    rss: string
    heapUsed: string
    percentage: number
  }
  uptime: number
}

export interface SystemMetrics {
  platform: string
  cpuCount: number
  totalMemory: string
  freeMemory: string
}

export interface CacheMetrics {
  hits: number
  misses: number
  hitRate: number
  keyCount: number
  memoryUsed: string
}

export interface MonitoringData {
  status: HealthStatus
  timestamp: string
  uptime: number
  health: {
    database: HealthCheck
    redis: HealthCheck
    disk: HealthCheck
    email: HealthCheck
  }
  metrics: {
    process: ProcessMetrics
    system: SystemMetrics
    cache: CacheMetrics
  }
}

export interface HistoryPoint {
  time: string
  database: number
  redis: number
  cpu: number
  memory: number
  cacheHitRate: number
}
