import { injectable } from 'inversify'
import { BaseHealthCheck } from './base_health_check.js'
import type { HealthCheckResult } from '#health/types/health'
import { promises as fs } from 'node:fs'
import os from 'node:os'

@injectable()
export default class DiskHealthCheck extends BaseHealthCheck {
  name = 'disk'

  async check(): Promise<HealthCheckResult> {
    try {
      const { result, latency } = await this.measureLatency(async () => {
        return await this.getDiskSpace()
      })

      const freePercentage = (result.free / result.total) * 100
      const usedPercentage = 100 - freePercentage

      const status = freePercentage < 10 ? 'down' : freePercentage < 20 ? 'degraded' : 'ok'

      return {
        status,
        latency,
        details: {
          total: this.formatBytes(result.total),
          used: this.formatBytes(result.used),
          free: this.formatBytes(result.free),
          freePercentage: Math.round(freePercentage),
          usedPercentage: Math.round(usedPercentage),
          path: result.path,
        },
      }
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown disk error',
      }
    }
  }

  private async getDiskSpace(): Promise<{
    total: number
    used: number
    free: number
    path: string
  }> {
    const path = process.cwd()

    // fs.promises.statfs is Node 18.15+ and not in the @types/node bundled
    // here; cast through unknown to a narrow shape rather than to any.
    type StatfsResult = { blocks: number; bavail: number; bsize: number }
    const fsWithStatfs = fs as unknown as {
      statfs?: (p: string) => Promise<StatfsResult>
    }

    try {
      if (typeof fsWithStatfs.statfs === 'function') {
        const stats = await fsWithStatfs.statfs(path)
        const total = stats.blocks * stats.bsize
        const free = stats.bavail * stats.bsize
        const used = total - free

        return { total, used, free, path }
      }
    } catch {}

    const total = os.totalmem()
    const free = os.freemem()
    const used = total - free

    return {
      total,
      used,
      free,
      path: 'system memory (fallback)',
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }
}
