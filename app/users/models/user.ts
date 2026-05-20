import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import encryption from '@adonisjs/core/services/encryption'
import Organization from '#organizations/models/organization'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import AuthorizationService from '#roles/services/authorization_service'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare fullName: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string | null

  @column()
  declare googleId: string | null

  @column()
  declare avatarUrl: string | null

  @column.dateTime()
  declare emailVerifiedAt: DateTime | null

  @column()
  declare locale: 'fr' | 'en'

  @column()
  declare newsletterEnabled: boolean

  @column()
  declare tipsEnabled: boolean

  @column()
  declare promotionalOffersEnabled: boolean

  @column.dateTime({ columnName: 'deleted_at' })
  declare deletedAt: DateTime | null

  @column({
    serializeAs: null,
    prepare: (value: string | null) => (value ? encryption.encrypt(value) : null),
    consume: (value: string | null) => (value ? encryption.decrypt<string>(value) : null),
  })
  declare twoFactorSecret: string | null

  @column()
  declare twoFactorEnabled: boolean

  @column({
    serializeAs: null,
    prepare: (value: string[] | null) =>
      value && value.length > 0 ? encryption.encrypt(value.join('\n')) : null,
    consume: (value: string | null) => {
      if (!value) return []
      const decrypted = encryption.decrypt<string>(value)
      return decrypted ? decrypted.split('\n').filter(Boolean) : []
    },
  })
  declare twoFactorBackupCodes: string[]

  @column.dateTime()
  declare twoFactorConfirmedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Getters
  get isEmailVerified(): boolean {
    return this.emailVerifiedAt !== null
  }

  @manyToMany(() => Organization, {
    pivotTable: 'user_organizations',
    pivotColumns: ['joined_at'],
    pivotTimestamps: true,
  })
  declare organizations: ManyToMany<typeof Organization>

  // Permission helper methods
  async hasRole(organizationId: string, roleSlug: string): Promise<boolean> {
    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)
    return authService.hasRole(this.id, organizationId, roleSlug)
  }

  async hasAnyRole(organizationId: string, roleSlugs: string[]): Promise<boolean> {
    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)
    return authService.hasAnyRole(this.id, organizationId, roleSlugs)
  }

  async hasAllRoles(organizationId: string, roleSlugs: string[]): Promise<boolean> {
    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)
    return authService.hasAllRoles(this.id, organizationId, roleSlugs)
  }

  async can(organizationId: string, permissionSlug: string): Promise<boolean> {
    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)
    return authService.can(this.id, organizationId, permissionSlug)
  }

  async canAny(organizationId: string, permissionSlugs: string[]): Promise<boolean> {
    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)
    return authService.canAny(this.id, organizationId, permissionSlugs)
  }

  async canAll(organizationId: string, permissionSlugs: string[]): Promise<boolean> {
    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)
    return authService.canAll(this.id, organizationId, permissionSlugs)
  }

  async getRolesIn(organizationId: string) {
    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)
    return authService.getUserRoles(this.id, organizationId)
  }

  async getPermissionsIn(organizationId: string) {
    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)
    return authService.getUserPermissions(this.id, organizationId)
  }

  async isSuperAdmin(): Promise<boolean> {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const result = await db
      .from('user_roles')
      .where('user_id', this.id)
      .where('role_slug', 'super-admin')
      .first()

    return !!result
  }
}
