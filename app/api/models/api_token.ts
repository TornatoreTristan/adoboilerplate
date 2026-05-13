import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#users/models/user'
import Organization from '#organizations/models/organization'
import type { ApiScope } from '#api/constants/api_scopes'

export default class ApiToken extends BaseModel {
  static table = 'api_tokens'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare organizationId: string | null

  @column()
  declare name: string

  @column({ serializeAs: null })
  declare tokenHash: string

  @column()
  declare prefix: string

  @column({
    prepare: (value: ApiScope[]) => JSON.stringify(value),
    consume: (value: string | ApiScope[]) =>
      typeof value === 'string' ? (JSON.parse(value) as ApiScope[]) : value,
  })
  declare scopes: ApiScope[]

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column.dateTime()
  declare lastUsedAt: DateTime | null

  @column.dateTime()
  declare revokedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deleted_at: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  get isRevoked(): boolean {
    return this.revokedAt !== null
  }

  get isExpired(): boolean {
    return this.expiresAt !== null && this.expiresAt < DateTime.now()
  }

  get isActive(): boolean {
    return !this.isRevoked && !this.isExpired && this.deleted_at === null
  }

  hasScope(scope: ApiScope): boolean {
    return this.scopes.includes(scope)
  }

  hasAllScopes(required: ApiScope[]): boolean {
    return required.every((scope) => this.scopes.includes(scope))
  }
}
