export interface User {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  googleId: string | null
  isEmailVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface Session {
  id: string
  ipAddress: string
  userAgent: string
  startedAt: string
  lastActivity: string
  endedAt: string | null
  isActive: boolean
  country: string | null
  city: string | null
  deviceType: string | null
  os: string | null
  browser: string | null
}

export interface AuditLog {
  id: string
  action: string
  resourceType: string | null
  resourceId: string | null
  ipAddress: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}
