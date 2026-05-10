import { injectable } from 'inversify'
import redis from '@adonisjs/redis/services/main'
import type { RateLimitConfig, RateLimitResult } from '#shared/types/rate_limit'

@injectable()
export default class RateLimitService {
  async checkLimit(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const {
      maxRequests,
      windowMs,
      keyPrefix = 'default',
    } = config

    const key = this.buildKey(identifier, keyPrefix)
    const now = Date.now()
    const windowStart = now - windowMs

    const multi = redis.multi()
    multi.zremrangebyscore(key, 0, windowStart)
    multi.zadd(key, now, `${now}:${Math.random()}`)
    multi.zcard(key)
    multi.pexpire(key, windowMs)

    const results = await multi.exec()
    if (!results) {
      throw new Error('Redis MULTI/EXEC pipeline returned null — the transaction was aborted')
    }
    const currentCount = results[2][1] as number

    const allowed = currentCount <= maxRequests
    const remaining = Math.max(0, maxRequests - currentCount)
    const resetAt = new Date(now + windowMs)

    return {
      allowed,
      remaining,
      resetAt,
      total: maxRequests,
    }
  }

  private buildKey(identifier: string, prefix: string): string {
    return `ratelimit:${prefix}:${identifier}`
  }
}