import { injectable } from 'inversify'
import db from '@adonisjs/lucid/services/db'
import { BaseHealthCheck } from './base_health_check.js'
import type { HealthCheckResult } from '#health/types/health'

@injectable()
export default class DatabaseHealthCheck extends BaseHealthCheck {
  name = 'database'

  async check(): Promise<HealthCheckResult> {
    try {
      const { latency } = await this.measureLatency(async () => {
        return await this.withTimeout(db.rawQuery('SELECT 1 as result'), this.config.timeout)
      })

      const connectionInfo = await this.getConnectionInfo()

      return {
        status: latency < 100 ? 'ok' : 'degraded',
        latency,
        details: {
          connection: connectionInfo,
        },
      }
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown database error',
      }
    }
  }

  private async getConnectionInfo(): Promise<Record<string, any>> {
    try {
      // The Knex pool is exposed at runtime but not in Lucid's typings.
      const pool = (db.connection() as unknown as { pool: any }).pool
      return {
        used: pool.numUsed(),
        free: pool.numFree(),
        pending: pool.numPendingAcquires(),
        max: pool.max,
      }
    } catch {
      return {}
    }
  }
}
