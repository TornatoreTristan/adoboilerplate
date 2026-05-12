import { injectable } from 'inversify'
import { DateTime } from 'luxon'
import UserSession from '#sessions/models/user_session'
import { BaseRepository } from '#shared/repositories/base_repository'

export interface DayCount {
  date: string
  count: number
}

@injectable()
export default class SessionRepository extends BaseRepository<typeof UserSession> {
  protected model = UserSession

  /**
   * Trouver toutes les sessions d'un utilisateur
   */
  async findByUserId(userId: string | number): Promise<UserSession[]> {
    return this.findBy(
      { user_id: userId },
      {
        cache: { ttl: 300, tags: ['sessions', `user_sessions_${userId}`] },
      }
    )
  }

  /**
   * Trouver les sessions actives d'un utilisateur
   */
  async findActiveByUserId(userId: string | number): Promise<UserSession[]> {
    const query = this.buildBaseQuery()

    return query.where('user_id', userId).where('is_active', true).orderBy('last_activity', 'desc')
  }

  /**
   * Trouver les sessions inactives récentes d'un utilisateur
   */
  async findInactiveByUserId(userId: string | number, limit: number = 20): Promise<UserSession[]> {
    const query = this.buildBaseQuery()

    return query
      .where('user_id', userId)
      .where('is_active', false)
      .orderBy('ended_at', 'desc')
      .limit(limit)
  }

  /**
   * Fermer une session (marquer comme inactive)
   */
  async closeSession(sessionId: string | number): Promise<UserSession> {
    return this.update(sessionId, {
      isActive: false,
      endedAt: DateTime.now(),
    })
  }

  /**
   * Fermer toutes les sessions d'un utilisateur sauf une
   */
  async closeOtherUserSessions(
    userId: string | number,
    exceptSessionId?: string | number
  ): Promise<void> {
    const query = this.model.query().where('user_id', userId).where('is_active', true)

    if (exceptSessionId) {
      query.whereNot('id', exceptSessionId)
    }

    await query.update({
      is_active: false,
      ended_at: DateTime.now(),
    })

    // Invalider les caches
    await this.cache?.invalidateTags(['sessions', `user_sessions_${userId}`])
  }

  /**
   * Nettoyer les sessions expirées
   */
  async cleanupExpiredSessions(): Promise<number> {
    const expiredDate = DateTime.now().minus({ hours: 24 }) // Sessions de plus de 24h

    const expiredSessions = await this.model
      .query()
      .where('last_activity', '<', expiredDate.toJSDate())
      .where('is_active', true)

    const count = expiredSessions.length

    await this.model
      .query()
      .where('last_activity', '<', expiredDate.toJSDate())
      .where('is_active', true)
      .update({
        is_active: false,
        ended_at: DateTime.now(),
      })

    // Invalider tous les caches de sessions
    await this.cache?.invalidateTags(['sessions'])

    return count
  }

  /**
   * Mettre à jour l'activité d'une session
   */
  async updateLastActivity(sessionId: string | number): Promise<UserSession> {
    return this.update(sessionId, {
      lastActivity: DateTime.now(),
    })
  }

  /**
   * Obtenir des statistiques de sessions
   */
  async getSessionStats(userId?: string | number): Promise<{
    total: number
    active: number
    today: number
  }> {
    const baseQuery = this.buildBaseQuery()

    if (userId) {
      baseQuery.where('user_id', userId)
    }

    const today = DateTime.now().startOf('day')

    const extractTotal = (rows: UserSession[]): number => {
      const row = rows[0] as { $extras?: { total?: string | number } } | undefined
      const total = row?.$extras?.total
      return typeof total === 'number' ? total : Number.parseInt((total as string) || '0', 10)
    }

    const [totalRows, activeRows, todayRows] = await Promise.all([
      baseQuery.clone().count('* as total'),
      baseQuery.clone().where('is_active', true).count('* as total'),
      baseQuery.clone().where('created_at', '>=', today.toJSDate()).count('* as total'),
    ])

    return {
      total: extractTotal(totalRows),
      active: extractTotal(activeRows),
      today: extractTotal(todayRows),
    }
  }

  async countByDayStarted(sinceDate: string): Promise<DayCount[]> {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const rows = await this.buildBaseQuery()
      .select(db.raw('DATE(started_at) as date'))
      .count('* as count')
      .where('started_at', '>=', sinceDate)
      .groupByRaw('DATE(started_at)')
      .orderBy('date', 'asc')

    type AggregateRow = UserSession & {
      $extras?: { date?: string | Date; count?: string | number }
      date?: string | Date
      count?: string | number
    }

    return (rows as AggregateRow[]).map((row) => {
      const extras = row.$extras || {}
      const rawDate = extras.date ?? row.date
      const date =
        rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate).slice(0, 10)
      return {
        date,
        count: Number(extras.count ?? row.count),
      }
    })
  }

  async countDistinctActiveUserIds(thresholdDate: string): Promise<number> {
    const rows = await this.buildBaseQuery()
      .select('user_id')
      .where('last_activity', '>=', thresholdDate)
      .groupBy('user_id')

    return rows.length
  }

  async getAverageSessionsPerUser(): Promise<number> {
    const rows = await this.buildBaseQuery()
      .select('user_id')
      .count('* as session_count')
      .groupBy('user_id')

    if (rows.length === 0) return 0

    type SessionCountRow = UserSession & {
      $extras?: { session_count?: string | number }
      session_count?: string | number
    }

    const totalSessions = (rows as SessionCountRow[]).reduce(
      (sum, row) => sum + Number(row.$extras?.session_count ?? row.session_count ?? 0),
      0
    )

    return Math.round((totalSessions / rows.length) * 100) / 100
  }

  async getLastActivityByUser(): Promise<Map<string, DateTime>> {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const rows = await this.buildBaseQuery()
      .select('user_id')
      .select(db.raw('MAX(last_activity) as last_activity'))
      .groupBy('user_id')

    type LastActivityRow = UserSession & {
      $extras?: { last_activity?: string | Date }
      last_activity?: string | Date
      user_id?: string
    }

    const map = new Map<string, DateTime>()
    for (const row of rows as LastActivityRow[]) {
      const extras = row.$extras || {}
      const rawValue = extras.last_activity ?? row.lastActivity ?? row.last_activity
      const userId = row.userId ?? row.user_id
      if (rawValue && userId) {
        const dt =
          rawValue instanceof Date
            ? DateTime.fromJSDate(rawValue)
            : DateTime.fromISO(String(rawValue))
        if (dt.isValid) {
          map.set(userId, dt)
        }
      }
    }

    return map
  }

  /**
   * Vérifier si une session appartient à un utilisateur
   */
  async isSessionOwnedByUser(
    sessionId: string | number,
    userId: string | number
  ): Promise<boolean> {
    const session = await this.findById(sessionId)
    return session?.userId === userId
  }

  /**
   * Hook après création - invalider les caches utilisateur
   */
  protected async afterCreate(session: UserSession): Promise<void> {
    await super.afterCreate(session)
    await this.cache?.invalidateTags([`user_sessions_${session.userId}`])
  }

  /**
   * Hook après mise à jour - invalider les caches utilisateur
   */
  protected async afterUpdate(session: UserSession): Promise<void> {
    await super.afterUpdate(session)
    await this.cache?.invalidateTags([`user_sessions_${session.userId}`])
  }

  /**
   * Hook après suppression - invalider les caches utilisateur
   */
  protected async afterDelete(session: UserSession): Promise<void> {
    await super.afterDelete(session)
    await this.cache?.invalidateTags([`user_sessions_${session.userId}`])
  }
}
