export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogContext {
  [key: string]: unknown
}

export interface CreateLogData {
  level: LogLevel
  message: string
  context?: LogContext
  userId?: string
  ip?: string
  userAgent?: string
  method?: string
  url?: string
  statusCode?: number
}

export interface LogFilters {
  level?: LogLevel
  search?: string
  userId?: string
  startDate?: string
  endDate?: string
  method?: string
  statusCode?: number
}
