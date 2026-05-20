import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { ManyToMany, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import User from '#users/models/user'
import Subscription from '#billing/models/subscription'
import type { TranslatableFieldNullable } from '#shared/helpers/translatable'

export default class Organization extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare slug: string

  @column({
    columnName: 'description_i18n',
    prepare: (value: TranslatableFieldNullable | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | TranslatableFieldNullable | null) => {
      if (value === null) return null
      return typeof value === 'string' ? JSON.parse(value) : value
    },
  })
  declare descriptionI18n: TranslatableFieldNullable | null

  @column()
  declare website: string | null

  @column()
  declare logoUrl: string | null

  @column()
  declare email: string | null

  @column()
  declare phone: string | null

  @column()
  declare siret: string | null

  @column()
  declare vatNumber: string | null

  @column()
  declare address: string | null

  @column()
  declare isActive: boolean

  @column.dateTime({ columnName: 'deleted_at' })
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @manyToMany(() => User, {
    pivotTable: 'user_organizations',
    pivotColumns: ['role', 'joined_at'],
    pivotTimestamps: true,
  })
  declare users: ManyToMany<typeof User>

  @hasMany(() => Subscription)
  declare subscriptions: HasMany<typeof Subscription>

  @hasOne(() => Subscription, {
    onQuery: (query) => {
      query.where('status', 'active').orderBy('created_at', 'desc')
    },
  })
  declare currentSubscription: HasOne<typeof Subscription>
}
