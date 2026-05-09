import { injectable, inject } from 'inversify'
import type { Redis } from 'ioredis'
import { TYPES } from '#shared/container/types'
import { BaseHealthCheck } from './base_health_check.js'
import type { HealthCheckResult } from '#health/types/health'

@injectable()
export default class RedisHealthCheck extends BaseHealthCheck {
  name = 'redis'

  constructor(@inject(TYPES.RedisClient) private redis: Redis) {
    super()
    this.config.timeout = 3000
  }

  async check(): Promise<HealthCheckResult> {
    try {
      const { latency } = await this.measureLatency(async () => {
        return await this.withTimeout(this.redis.ping(), this.config.timeout)
      })

      const memoryInfo = await this.getMemoryInfo()

      return {
        status: latency < 50 ? 'ok' : 'degraded',
        latency,
        details: {
          memory: memoryInfo,
        },
      }
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown Redis error',
      }
    }
  }

  private async getMemoryInfo(): Promise<Record<string, any>> {
    try {
      const info = await this.redis.info('memory')
      const usedMemoryMatch = info.match(/used_memory_human:(.+)/)
      const maxMemoryMatch = info.match(/maxmemory_human:(.+)/)

      return {
        used: usedMemoryMatch ? usedMemoryMatch[1].trim() : 'unknown',
        max: maxMemoryMatch ? maxMemoryMatch[1].trim() : 'unlimited',
      }
    } catch {
      return {}
    }
  }
}
