import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#organizations/models/organization'
import User from '#users/models/user'

export default class OrganizationInvitation extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare email: string

  @column()
  declare organizationId: string

  @column()
  declare invitedById: string | null

  @column()
  declare role: string

  @column()
  declare token: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime()
  declare acceptedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => User, {
    foreignKey: 'invitedById',
  })
  declare invitedBy: BelongsTo<typeof User>

  get isExpired() {
    return this.expiresAt < DateTime.now()
  }

  get isAccepted() {
    return this.acceptedAt !== null
  }

  get isPending() {
    return !this.isAccepted && !this.isExpired
  }
}
