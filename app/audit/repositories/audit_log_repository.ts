import { injectable } from 'inversify'
import { BaseRepository } from '#shared/repositories/base_repository'
import AuditLog from '#audit/models/audit_log'
import type { AuditLogFilters, AuditLogWithRelations } from '#audit/types/audit'
import db from '@adonisjs/lucid/services/db'

@injectable()
export default class AuditLogRepository extends BaseRepository<typeof AuditLog> {
  protected model = AuditLog

  /**
   * Full-text search across audit logs
   */
  async search(query: string, limit: number = 50): Promise<AuditLog[]> {
    const result = await db
      .from('audit_logs')
      .select('*')
      .select(db.raw(`ts_rank(search_vector, plainto_tsquery('french', ?)) as rank`, [query]))
      .whereRaw(`search_vector @@ plainto_tsquery('french', ?)`, [query])
      .orderBy('rank', 'desc')
      .orderBy('created_at', 'desc')
      .limit(limit)

    return result as AuditLog[]
  }

  /**
   * Find audit logs by user ID
   */
  async findByUser(userId: string, limit: number = 100): Promise<AuditLog[]> {
    const logs = await this.model
      .query()
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)

    return logs
  }

  /**
   * Find audit logs by organization ID
   */
  async findByOrganization(organizationId: string, limit: number = 100): Promise<AuditLog[]> {
    const logs = await this.model
      .query()
      .where('organization_id', organizationId)
      .orderBy('created_at', 'desc')
      .limit(limit)

    return logs
  }

  /**
   * Find audit logs by action
   */
  async findByAction(action: string, limit: number = 100): Promise<AuditLog[]> {
    const logs = await this.model
      .query()
      .where('action', action)
      .orderBy('created_at', 'desc')
      .limit(limit)

    return logs
  }

  /**
   * Find audit logs by resource
   */
  async findByResource(
    resourceType: string,
    resourceId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    const logs = await this.model
      .query()
      .where('resource_type', resourceType)
      .where('resource_id', resourceId)
      .orderBy('created_at', 'desc')
      .limit(limit)

    return logs
  }

  /**
   * Find audit logs with advanced filters
   */
  async findWithFilters(filters: AuditLogFilters): Promise<{
    data: AuditLogWithRelations[]
    total: number
    hasMore: boolean
  }> {
    const limit = filters.limit || 50
    const offset = filters.offset || 0

    // Build base query (no select, just WHERE clauses)
    const buildBaseQuery = () => {
      let baseQuery = db.from('audit_logs')

      // Apply filters
      if (filters.userId) {
        baseQuery = baseQuery.where('user_id', filters.userId)
      }

      if (filters.organizationId) {
        baseQuery = baseQuery.where('organization_id', filters.organizationId)
      }

      if (filters.action) {
        baseQuery = baseQuery.where('action', filters.action)
      }

      if (filters.resourceType) {
        baseQuery = baseQuery.where('resource_type', filters.resourceType)
      }

      if (filters.resourceId) {
        baseQuery = baseQuery.where('resource_id', filters.resourceId)
      }

      if (filters.search) {
        baseQuery = baseQuery.whereRaw(`search_vector @@ plainto_tsquery('french', ?)`, [
          filters.search,
        ])
      }

      if (filters.startDate) {
        baseQuery = baseQuery.where('created_at', '>=', filters.startDate)
      }

      if (filters.endDate) {
        baseQuery = baseQuery.where('created_at', '<=', filters.endDate)
      }

      return baseQuery
    }

    // Get total count
    const countQuery = buildBaseQuery().count('* as total')
    const [{ total }] = await countQuery
    const totalCount = Number(total)

    // Get paginated results
    const results = await buildBaseQuery()
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit + 1) // Fetch one extra to check if there are more
      .offset(offset)

    const hasMore = results.length > limit
    const data = hasMore ? results.slice(0, limit) : results

    // Preload relations
    const logsWithRelations = await this.preloadRelations(data as AuditLog[])

    return {
      data: logsWithRelations,
      total: totalCount,
      hasMore,
    }
  }

  /**
   * Preload user and organization relations
   */
  private async preloadRelations(logs: AuditLog[]): Promise<AuditLogWithRelations[]> {
    if (logs.length === 0) return []

    const userIds = [...new Set(logs.map((log) => log.userId).filter(Boolean) as string[])]
    const organizationIds = [
      ...new Set(logs.map((log) => log.organizationId).filter(Boolean) as string[]),
    ]

    // Fetch users
    const users =
      userIds.length > 0
        ? await db
            .from('users')
            .select('id', 'email', 'full_name as fullName')
            .whereIn('id', userIds)
        : []

    // Fetch organizations
    const organizations =
      organizationIds.length > 0
        ? await db.from('organizations').select('id', 'name').whereIn('id', organizationIds)
        : []

    // Map relations
    const userMap = new Map(users.map((u: any) => [u.id, u]))
    const orgMap = new Map(organizations.map((o: any) => [o.id, o]))

    return logs.map((log) => {
      // Handle createdAt - could be DateTime, Date, or string
      let createdAtString: string
      if (typeof log.createdAt === 'string') {
        createdAtString = log.createdAt
      } else if (log.createdAt && typeof log.createdAt.toISO === 'function') {
        createdAtString = log.createdAt.toISO() || log.createdAt.toString()
      } else if (log.createdAt instanceof Date) {
        createdAtString = log.createdAt.toISOString()
      } else {
        createdAtString = new Date().toISOString()
      }

      return {
        id: log.id,
        userId: log.userId,
        organizationId: log.organizationId,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        metadata: log.metadata,
        createdAt: createdAtString,
        user: log.userId ? userMap.get(log.userId) : undefined,
        organization: log.organizationId ? orgMap.get(log.organizationId) : undefined,
      }
    }) as AuditLogWithRelations[]
  }

  /**
   * Get recent audit logs (last N days)
   */
  async getRecent(days: number = 7, limit: number = 100): Promise<AuditLog[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const logs = await this.model
      .query()
      .where('created_at', '>=', startDate)
      .orderBy('created_at', 'desc')
      .limit(limit)

    return logs
  }

  /**
   * Get audit log statistics
   */
  async getStatistics(filters?: {
    startDate?: Date
    endDate?: Date
    userId?: string
    organizationId?: string
  }): Promise<{
    totalLogs: number
    uniqueUsers: number
    uniqueOrganizations: number
    topActions: Array<{ action: string; count: number }>
  }> {
    let baseQuery = db.from('audit_logs')

    if (filters?.startDate) {
      baseQuery = baseQuery.where('created_at', '>=', filters.startDate)
    }

    if (filters?.endDate) {
      baseQuery = baseQuery.where('created_at', '<=', filters.endDate)
    }

    if (filters?.userId) {
      baseQuery = baseQuery.where('user_id', filters.userId)
    }

    if (filters?.organizationId) {
      baseQuery = baseQuery.where('organization_id', filters.organizationId)
    }

    const [totalLogs, uniqueUsers, uniqueOrganizations, topActions] = await Promise.all([
      baseQuery.clone().count('* as count').first(),
      baseQuery.clone().countDistinct('user_id as count').first(),
      baseQuery.clone().countDistinct('organization_id as count').first(),
      baseQuery
        .clone()
        .select('action')
        .count('* as count')
        .groupBy('action')
        .orderBy('count', 'desc')
        .limit(10),
    ])

    return {
      totalLogs: Number(totalLogs?.count || 0),
      uniqueUsers: Number(uniqueUsers?.count || 0),
      uniqueOrganizations: Number(uniqueOrganizations?.count || 0),
      topActions: topActions.map((row: any) => ({
        action: row.action,
        count: Number(row.count),
      })),
    }
  }
}
