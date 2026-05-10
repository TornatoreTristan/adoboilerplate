export interface Log {
  id: string
  level: string
  message: string
  context: Record<string, any> | null
  userId: string | null
  ip: string | null
  userAgent: string | null
  method: string | null
  url: string | null
  statusCode: number | null
  createdAt: string
  user?: {
    id: string
    fullName: string | null
    email: string
  }
}

export interface LogStats {
  total: number
  byLevel: Record<string, number>
  last24h: number
}

export interface LogFilters {
  level: string
  search: string
  method: string
}
