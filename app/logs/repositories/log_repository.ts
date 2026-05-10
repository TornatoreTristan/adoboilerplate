import { injectable } from 'inversify'
import { BaseRepository } from '#shared/repositories/base_repository'
import Log from '#logs/models/log'
import type { LogFilters } from '#logs/types/log'
import { DateTime } from 'luxon'

function toSqlOrNow(dt: DateTime): string {
  return dt.toSQL() ?? dt.toISO() ?? new Date().toISOString()
}

@injectable()
export default class LogRepository extends BaseRepository<typeof Log> {
  protected model = Log

  async findWithFilters(
    filters: LogFilters,
    page: number = 1,
    perPage: number = 50
  ): Promise<{ data: Log[]; total: number; page: number; perPage: number }> {
    const query = Log.query().preload('user', (userQuery) => {
      userQuery.select('id', 'full_name', 'email')
    })

    if (filters.level) {
      query.where('level', filters.level)
    }

    if (filters.userId) {
      query.where('user_id', filters.userId)
    }

    if (filters.method) {
      query.where('method', filters.method)
    }

    if (filters.statusCode) {
      query.where('status_code', filters.statusCode)
    }

    if (filters.startDate) {
      query.where('created_at', '>=', toSqlOrNow(DateTime.fromISO(filters.startDate)))
    }

    if (filters.endDate) {
      query.where('created_at', '<=', toSqlOrNow(DateTime.fromISO(filters.endDate)))
    }

    if (filters.search) {
      query.whereRaw(`search_vector @@ plainto_tsquery('french', ?)`, [filters.search])
    }

    query.orderBy('created_at', 'desc')

    const result = await query.paginate(page, perPage)

    return {
      data: result.all(),
      total: result.total,
      page: result.currentPage,
      perPage: result.perPage,
    }
  }

  async search(query: string, limit: number = 50): Promise<Log[]> {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    return Log.query()
      .select('*')
      .select(db.raw(`ts_rank(search_vector, plainto_tsquery('french', ?)) as rank`, [query]))
      .whereRaw(`search_vector @@ plainto_tsquery('french', ?)`, [query])
      .orderBy('rank', 'desc')
      .limit(limit)
  }

  async deleteOlderThan(date: DateTime): Promise<number> {
    const result = (await Log.query().where('created_at', '<', toSqlOrNow(date)).delete()) as
      | unknown
      | number
      | [number]
    return Array.isArray(result) ? (result[0] as number) : (result as number)
  }

  async getStats(): Promise<{
    total: number
    byLevel: Record<string, number>
    last24h: number
  }> {
    const [total, byLevel, last24h] = await Promise.all([
      Log.query().count('* as total').first(),
      Log.query().select('level').count('* as count').groupBy('level'),
      Log.query()
        .where('created_at', '>=', toSqlOrNow(DateTime.now().minus({ hours: 24 })))
        .count('* as total')
        .first(),
    ])

    return {
      total: Number(total?.$extras.total || 0),
      byLevel: byLevel.reduce(
        (acc, item) => {
          acc[item.level] = Number(item.$extras.count)
          return acc
        },
        {} as Record<string, number>
      ),
      last24h: Number(last24h?.$extras.total || 0),
    }
  }
}
