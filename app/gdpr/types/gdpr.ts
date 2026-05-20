export interface UserDataExport {
  exportDate: string
  user: {
    id: string
    email: string
    fullName: string | null
    createdAt: string
    isEmailVerified: boolean
  }
  profile: {
    avatarUrl: string | null
    locale: string | null
  }
  organizations: Array<{
    id: string
    name: string
    role: string
    joinedAt: string
  }>
  notifications: Array<{
    id: string
    type: string
    data: Record<string, unknown>
    readAt: string | null
    createdAt: string
  }>
  uploads: Array<{
    id: string
    filename: string
    mimeType: string
    size: number
    uploadedAt: string
  }>
  sessions: Array<{
    id: string
    ipAddress: string | null
    userAgent: string | null
    lastActivityAt: string
    createdAt: string
  }>
  subscriptions: Array<{
    id: string
    planName: string
    status: string
    currentPeriodStart: string | null
    currentPeriodEnd: string | null
  }>
}

export interface AccountDeletionRequest {
  userId: string
  requestedAt: string
  scheduledFor: string
  reason?: string
}

export interface GdprAuditLog {
  userId: string
  action: 'data_export' | 'account_deletion_requested' | 'account_deleted'
  requestedAt: string
  completedAt?: string
  ipAddress?: string
  metadata?: Record<string, unknown>
}
