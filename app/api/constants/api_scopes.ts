export const API_SCOPES = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  ORGANIZATIONS_READ: 'organizations:read',
  ORGANIZATIONS_WRITE: 'organizations:write',
  UPLOADS_READ: 'uploads:read',
  UPLOADS_WRITE: 'uploads:write',
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_WRITE: 'notifications:write',
} as const

export type ApiScope = (typeof API_SCOPES)[keyof typeof API_SCOPES]

export const ALL_API_SCOPES: ApiScope[] = Object.values(API_SCOPES)

export function isValidScope(scope: string): scope is ApiScope {
  return ALL_API_SCOPES.includes(scope as ApiScope)
}
