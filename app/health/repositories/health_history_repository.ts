import { injectable } from 'inversify'
import { BaseRepository } from '#shared/repositories/base_repository'
import HealthHistory from '#health/models/health_history'
import { DateTime } from 'luxon'

function toSqlOrThrow(dt: DateTime): string {
  const sql = dt.toSQL()
  if (!sql) {
    throw new Error(`Invalid DateTime passed to HealthHistoryRepository: ${dt.invalidReason}`)
  }
  return sql
}

@injectable()
export default class HealthHistoryRepository extends BaseRepository<typeof HealthHistory> {
  protected model = HealthHistory

  async getHistory(limit: number = 100): Promise<HealthHistory[]> {
    return HealthHistory.query().orderBy('created_at', 'desc').limit(limit)
  }

  async getHistorySince(since: DateTime, limit: number = 1000): Promise<HealthHistory[]> {
    return HealthHistory.query()
      .where('created_at', '>=', toSqlOrThrow(since))
      .orderBy('created_at', 'desc')
      .limit(limit)
  }

  async getHistoryForPeriod(startDate: DateTime, endDate: DateTime): Promise<HealthHistory[]> {
    return HealthHistory.query()
      .whereBetween('created_at', [toSqlOrThrow(startDate), toSqlOrThrow(endDate)])
      .orderBy('created_at', 'asc')
  }

  async deleteOlderThan(date: DateTime): Promise<number> {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const result = (await db
      .from(HealthHistory.table)
      .where('created_at', '<', toSqlOrThrow(date))
      .delete()) as unknown as number | [number]
    return Array.isArray(result) ? result[0] : result
  }
}
