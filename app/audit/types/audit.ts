import type { HttpContext } from '@adonisjs/core/http'

/**
 * Audit action types
 */
export const AuditAction = {
  // Authentication
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILED: 'auth.login.failed',
  LOGOUT: 'auth.logout',
  PASSWORD_RESET_REQUESTED: 'auth.password.reset.requested',
  PASSWORD_RESET_COMPLETED: 'auth.password.reset.completed',
  PASSWORD_CHANGED: 'auth.password.changed',

  // User management
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_RESTORED: 'user.restored',
  USER_PROFILE_UPDATED: 'user.profile.updated',

  // Organization management
  ORGANIZATION_CREATED: 'organization.created',
  ORGANIZATION_UPDATED: 'organization.updated',
  ORGANIZATION_DELETED: 'organization.deleted',
  ORGANIZATION_MEMBER_ADDED: 'organization.member.added',
  ORGANIZATION_MEMBER_REMOVED: 'organization.member.removed',
  ORGANIZATION_MEMBER_ROLE_CHANGED: 'organization.member.role.changed',

  // Invitations
  INVITATION_SENT: 'invitation.sent',
  INVITATION_ACCEPTED: 'invitation.accepted',
  INVITATION_REJECTED: 'invitation.rejected',

  // Notifications
  NOTIFICATION_CREATED: 'notification.created',
  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_DELETED: 'notification.deleted',

  // Subscriptions
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_PAUSED: 'subscription.paused',
  SUBSCRIPTION_RESUMED: 'subscription.resumed',

  // GDPR
  DATA_EXPORT_REQUESTED: 'gdpr.data.export.requested',
  ACCOUNT_DELETION_REQUESTED: 'gdpr.account.deletion.requested',
  ACCOUNT_DELETION_CANCELLED: 'gdpr.account.deletion.cancelled',
  ACCOUNT_DELETED_PERMANENTLY: 'gdpr.account.deleted.permanently',

  // Uploads
  FILE_UPLOADED: 'upload.created',
  FILE_DELETED: 'upload.deleted',

  // Settings
  SETTINGS_UPDATED: 'settings.updated',
  NOTIFICATION_PREFERENCES_UPDATED: 'settings.notifications.updated',
} as const

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction]

/**
 * Data required to create an audit log entry
 */
export interface CreateAuditLogData {
  userId?: string | null
  organizationId?: string | null
  action: AuditActionType | string
  resourceType?: string | null
  resourceId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Filters for querying audit logs
 */
export interface AuditLogFilters {
  userId?: string
  organizationId?: string
  action?: string
  resourceType?: string
  resourceId?: string
  search?: string // Full-text search
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

/**
 * Audit log with preloaded relations
 */
export interface AuditLogWithRelations {
  id: string
  userId: string | null
  organizationId: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date | string
  user?: {
    id: string
    email: string
    fullName: string | null
  }
  organization?: {
    id: string
    name: string
  }
}

/**
 * Helper to extract audit context from HTTP request
 */
export function extractAuditContext(ctx: HttpContext): {
  userId: string | null
  organizationId: string | null
  ipAddress: string | null
  userAgent: string | null
} {
  return {
    userId: ctx.auth.user?.id || null,
    organizationId: null, // Organization context should be provided explicitly
    ipAddress: ctx.request.ip() || null,
    userAgent: ctx.request.header('user-agent') || null,
  }
}
