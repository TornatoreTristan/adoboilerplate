import { inject, injectable } from 'inversify'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { TYPES } from '#shared/container/types'
import type AuditLogRepository from '#audit/repositories/audit_log_repository'
import type {
  CreateAuditLogData,
  AuditLogFilters,
  AuditLogWithRelations,
  AuditActionType,
} from '#audit/types/audit'
import type AuditLog from '#audit/models/audit_log'
import type { HttpContext } from '@adonisjs/core/http'

const DEFAULT_RETENTION_DAYS = 90

@injectable()
export default class AuditLogService {
  constructor(
    @inject(TYPES.AuditLogRepository)
    private auditLogRepository: AuditLogRepository
  ) {}

  /**
   * Create an audit log entry
   */
  async log(data: CreateAuditLogData): Promise<AuditLog> {
    return this.auditLogRepository.create({
      userId: data.userId || null,
      organizationId: data.organizationId || null,
      action: data.action,
      resourceType: data.resourceType || null,
      resourceId: data.resourceId || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      metadata: data.metadata || null,
    })
  }

  /**
   * Create an audit log from HTTP context
   */
  async logFromContext(
    ctx: HttpContext,
    action: AuditActionType | string,
    options?: {
      organizationId?: string | null
      resourceType?: string
      resourceId?: string
      metadata?: Record<string, any>
    }
  ): Promise<AuditLog> {
    return this.log({
      userId: ctx.auth.user?.id || null,
      organizationId: options?.organizationId || null,
      action,
      resourceType: options?.resourceType,
      resourceId: options?.resourceId,
      ipAddress: ctx.request.ip(),
      userAgent: ctx.request.header('user-agent'),
      metadata: options?.metadata,
    })
  }

  /**
   * Full-text search across audit logs
   */
  async search(query: string, limit?: number): Promise<AuditLog[]> {
    return this.auditLogRepository.search(query, limit)
  }

  /**
   * Find audit logs with filters
   */
  async findWithFilters(filters: AuditLogFilters): Promise<{
    data: AuditLogWithRelations[]
    total: number
    hasMore: boolean
  }> {
    return this.auditLogRepository.findWithFilters(filters)
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserLogs(userId: string, limit?: number): Promise<AuditLog[]> {
    return this.auditLogRepository.findByUser(userId, limit)
  }

  /**
   * Get audit logs for a specific organization
   */
  async getOrganizationLogs(organizationId: string, limit?: number): Promise<AuditLog[]> {
    return this.auditLogRepository.findByOrganization(organizationId, limit)
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceLogs(
    resourceType: string,
    resourceId: string,
    limit?: number
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.findByResource(resourceType, resourceId, limit)
  }

  /**
   * Get recent audit logs
   */
  async getRecent(days?: number, limit?: number): Promise<AuditLog[]> {
    return this.auditLogRepository.getRecent(days, limit)
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
    return this.auditLogRepository.getStatistics(filters)
  }

  /**
   * Get audit log by ID
   */
  async getById(id: string): Promise<AuditLog | null> {
    return this.auditLogRepository.findById(id)
  }

  /**
   * Resolves the retention cut-off in days from an explicit override or the
   * validated AUDIT_LOG_RETENTION_DAYS env var, falling back to 90.
   */
  private resolveCutoffDays(daysOverride?: number): number {
    return daysOverride ?? env.get('AUDIT_LOG_RETENTION_DAYS') ?? DEFAULT_RETENTION_DAYS
  }

  /**
   * Count how many audit logs would be purged for the configured retention
   * period — used by the `audit:purge --dry-run` command.
   */
  async countOldLogs(daysOverride?: number): Promise<{ count: number; cutoffDays: number }> {
    const cutoffDays = this.resolveCutoffDays(daysOverride)
    const count = await this.auditLogRepository.countOlderThan(cutoffDays)
    return { count, cutoffDays }
  }

  /**
   * Purge audit logs older than the configured retention period.
   * Reads AUDIT_LOG_RETENTION_DAYS from env (defaults to 90).
   * daysOverride takes precedence when provided.
   */
  async purgeOldLogs(daysOverride?: number): Promise<{ purged: number; cutoffDays: number }> {
    const cutoffDays = this.resolveCutoffDays(daysOverride)

    const purged = await this.auditLogRepository.purgeOlderThan(cutoffDays)

    logger.info({ purged, cutoffDays }, 'Audit logs purged')

    return { purged, cutoffDays }
  }
}
