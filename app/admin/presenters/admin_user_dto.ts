import type User from '#users/models/user'
import { DateTime } from 'luxon'

export interface AdminUserListItem {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  googleId: string | null
  isEmailVerified: boolean
  createdAt: string | null
  lastActivity: string | null
}

export interface AdminUserDetail {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  googleId: string | null
  isEmailVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminUserSessionDto {
  id: string
  ipAddress: string | null
  userAgent: string | null
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

export interface AdminAuditLogDto {
  id: string
  action: string
  resourceType: string | null
  resourceId: string | null
  ipAddress: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export class AdminUserDto {
  static presentListItem(user: {
    id: string
    fullName: string | null
    email: string
    avatarUrl: string | null
    googleId: string | null
    isEmailVerified: boolean
    createdAt: string | DateTime | null
    lastActivity?: DateTime | null
  }): AdminUserListItem {
    const createdAt =
      user.createdAt instanceof DateTime
        ? user.createdAt.toISO()
        : (user.createdAt as string | null)

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      googleId: user.googleId,
      isEmailVerified: user.isEmailVerified,
      createdAt,
      lastActivity: user.lastActivity?.toISO() ?? null,
    }
  }

  static presentDetail(user: User): AdminUserDetail {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      googleId: user.googleId,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt.toISO() ?? '',
      updatedAt: user.updatedAt.toISO() ?? '',
    }
  }

  static presentSession(session: {
    id: string
    ipAddress: string | null
    userAgent: string | null
    startedAt: DateTime
    lastActivity: DateTime
    endedAt?: DateTime | null
    isActive: boolean
    country: string | null
    city: string | null
    deviceType: string | null
    os: string | null
    browser: string | null
  }): AdminUserSessionDto {
    return {
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      startedAt: session.startedAt.toISO() ?? '',
      lastActivity: session.lastActivity.toISO() ?? '',
      endedAt: session.endedAt?.toISO() ?? null,
      isActive: session.isActive,
      country: session.country,
      city: session.city,
      deviceType: session.deviceType,
      os: session.os,
      browser: session.browser,
    }
  }

  static presentAuditLog(log: {
    id: string
    action: string
    resourceType: string | null
    resourceId: string | null
    ipAddress: string | null
    metadata: Record<string, unknown> | null
    createdAt: DateTime
  }): AdminAuditLogDto {
    return {
      id: log.id,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      ipAddress: log.ipAddress,
      metadata: log.metadata,
      createdAt: log.createdAt.toISO() ?? '',
    }
  }
}
