export type RateLimitStrategy = 'ip' | 'user' | 'global' | 'token'

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  strategy?: RateLimitStrategy
  keyPrefix?: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  total: number
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}
