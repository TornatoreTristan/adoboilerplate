export type HealthStatus = 'ok' | 'degraded' | 'down'

export interface HealthCheckResult {
  status: HealthStatus
  latency?: number
  details?: Record<string, unknown>
  error?: string
}

export interface HealthResponse {
  status: HealthStatus
  timestamp: string
  uptime?: number
  version?: string
  checks?: Record<string, HealthCheckResult>
}

export interface HealthCheck {
  name: string
  check(): Promise<HealthCheckResult>
}

export interface HealthCheckConfig {
  timeout: number
  critical: boolean
}
