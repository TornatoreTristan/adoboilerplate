import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AuditLogService from '#audit/services/audit_log_service'
import type { AuditLogFilters } from '#audit/types/audit'

export default class AuditLogsController {
  /**
   * Display audit logs dashboard with filters
   */
  async index({ request, inertia }: HttpContext) {
    const auditLogService = getService<AuditLogService>(TYPES.AuditLogService)

    // Extract filters from query string
    const filters: AuditLogFilters = {
      userId: request.input('userId'),
      organizationId: request.input('organizationId'),
      action: request.input('action'),
      resourceType: request.input('resourceType'),
      resourceId: request.input('resourceId'),
      search: request.input('search'),
      startDate: request.input('startDate') ? new Date(request.input('startDate')) : undefined,
      endDate: request.input('endDate') ? new Date(request.input('endDate')) : undefined,
      limit: Number.parseInt(request.input('limit', '50')),
      offset: Number.parseInt(request.input('offset', '0')),
    }

    const { data, total, hasMore } = await auditLogService.findWithFilters(filters)

    // Get statistics for the current filters
    const stats = await auditLogService.getStatistics({
      startDate: filters.startDate,
      endDate: filters.endDate,
      userId: filters.userId,
      organizationId: filters.organizationId,
    })

    return inertia.render('admin/audit-logs/index', {
      logs: data,
      total,
      hasMore,
      filters,
      stats,
    } as any)
  }

  /**
   * Display a single audit log entry
   */
  async show({ params, inertia }: HttpContext) {
    const auditLogService = getService<AuditLogService>(TYPES.AuditLogService)

    const log = await auditLogService.getById(params.id)

    if (!log) {
      return inertia.render('errors/not_found', {})
    }

    return inertia.render('admin/audit-logs/show', {
      log,
    })
  }

  /**
   * Get audit log statistics (API endpoint)
   */
  async stats({ request }: HttpContext) {
    const auditLogService = getService<AuditLogService>(TYPES.AuditLogService)

    const filters = {
      startDate: request.input('startDate') ? new Date(request.input('startDate')) : undefined,
      endDate: request.input('endDate') ? new Date(request.input('endDate')) : undefined,
      userId: request.input('userId'),
      organizationId: request.input('organizationId'),
    }

    const stats = await auditLogService.getStatistics(filters)

    return stats
  }

  /**
   * Search audit logs (API endpoint)
   */
  async search({ request }: HttpContext) {
    const auditLogService = getService<AuditLogService>(TYPES.AuditLogService)

    const query = request.input('q', '')
    const limit = Number.parseInt(request.input('limit', '50'))

    const results = await auditLogService.search(query, limit)

    return { results }
  }

  /**
   * Get recent audit logs (API endpoint)
   */
  async recent({ request }: HttpContext) {
    const auditLogService = getService<AuditLogService>(TYPES.AuditLogService)

    const days = Number.parseInt(request.input('days', '7'))
    const limit = Number.parseInt(request.input('limit', '100'))

    const logs = await auditLogService.getRecent(days, limit)

    return { logs }
  }

  /**
   * Get audit logs for a specific user (API endpoint)
   */
  async userLogs({ params, request }: HttpContext) {
    const auditLogService = getService<AuditLogService>(TYPES.AuditLogService)

    const limit = Number.parseInt(request.input('limit', '100'))

    const logs = await auditLogService.getUserLogs(params.userId, limit)

    return { logs }
  }

  /**
   * Get audit logs for a specific organization (API endpoint)
   */
  async organizationLogs({ params, request }: HttpContext) {
    const auditLogService = getService<AuditLogService>(TYPES.AuditLogService)

    const limit = Number.parseInt(request.input('limit', '100'))

    const logs = await auditLogService.getOrganizationLogs(params.organizationId, limit)

    return { logs }
  }

  /**
   * Get audit logs for a specific resource (API endpoint)
   */
  async resourceLogs({ params, request }: HttpContext) {
    const auditLogService = getService<AuditLogService>(TYPES.AuditLogService)

    const limit = Number.parseInt(request.input('limit', '100'))

    const logs = await auditLogService.getResourceLogs(
      params.resourceType,
      params.resourceId,
      limit
    )

    return { logs }
  }
}
