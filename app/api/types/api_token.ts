import type { ApiScope } from '#api/constants/api_scopes'

export interface CreateApiTokenData {
  userId: string
  organizationId?: string | null
  name: string
  scopes: ApiScope[]
  expiresAt?: Date | null
}

export interface GeneratedApiToken {
  id: string
  plainToken: string
  prefix: string
  name: string
  scopes: ApiScope[]
  expiresAt: Date | null
  createdAt: Date
}
