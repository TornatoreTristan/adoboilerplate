import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import type { Redis } from 'ioredis'
import os from 'node:os'

export interface ProcessMetrics {
  cpuUsagePercent: number
  memoryUsage: {
    rss: string
    heapUsed: string
    heapTotal: string
    external: string
    percentage: number
  }
  uptime: number
}

export interface SystemMetrics {
  platform: string
  arch: string
  nodeVersion: string
  cpuCount: number
  totalMemory: string
  freeMemory: string
  loadAverage: number[]
}

export interface CacheMetrics {
  hits: number
  misses: number
  hitRate: number
  keyCount: number
  memoryUsed: string
  memoryPeak: string
}

@injectable()
export default class MetricsService {
  private startTime: number = Date.now()

  constructor(@inject(TYPES.RedisClient) private redis: Redis) {}

  async getProcessMetrics(): Promise<ProcessMetrics> {
    const memUsage = process.memoryUsage()
    const totalMemory = os.totalmem()
    const memoryPercentage = Math.round((memUsage.rss / totalMemory) * 100)

    return {
      cpuUsagePercent: this.getCpuUsagePercent(),
      memoryUsage: {
        rss: this.formatBytes(memUsage.rss),
        heapUsed: this.formatBytes(memUsage.heapUsed),
        heapTotal: this.formatBytes(memUsage.heapTotal),
        external: this.formatBytes(memUsage.external),
        percentage: memoryPercentage,
      },
      uptime: Math.floor(process.uptime()),
    }
  }

  getSystemMetrics(): SystemMetrics {
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpuCount: os.cpus().length,
      totalMemory: this.formatBytes(os.totalmem()),
      freeMemory: this.formatBytes(os.freemem()),
      loadAverage: os.loadavg(),
    }
  }

  async getCacheMetrics(): Promise<CacheMetrics> {
    try {
      const info = await this.redis.info('stats')
      const memoryInfo = await this.redis.info('memory')

      const hitsMatch = info.match(/keyspace_hits:(\d+)/)
      const missesMatch = info.match(/keyspace_misses:(\d+)/)
      const hits = hitsMatch ? Number.parseInt(hitsMatch[1]) : 0
      const misses = missesMatch ? Number.parseInt(missesMatch[1]) : 0
      const total = hits + misses
      const hitRate = total > 0 ? Math.round((hits / total) * 100) : 0

      const memoryUsedMatch = memoryInfo.match(/used_memory_human:(.+)/)
      const memoryPeakMatch = memoryInfo.match(/used_memory_peak_human:(.+)/)

      const keyCount = await this.redis.dbsize()

      return {
        hits,
        misses,
        hitRate,
        keyCount,
        memoryUsed: memoryUsedMatch ? memoryUsedMatch[1].trim() : 'unknown',
        memoryPeak: memoryPeakMatch ? memoryPeakMatch[1].trim() : 'unknown',
      }
    } catch (error) {
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        keyCount: 0,
        memoryUsed: 'unknown',
        memoryPeak: 'unknown',
      }
    }
  }

  private getCpuUsagePercent(): number {
    const cpuUsage = process.cpuUsage()
    const totalUsage = cpuUsage.user + cpuUsage.system
    const uptime = process.uptime() * 1000000
    const percentage = (totalUsage / uptime) * 100
    return Math.round(percentage * 10) / 10
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  getAppUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000)
  }
}
