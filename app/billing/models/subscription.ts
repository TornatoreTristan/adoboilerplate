import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Plan, { type PlanInterval } from './plan.js'
import Organization from '#organizations/models/organization'

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'
  | 'unpaid'

export default class Subscription extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare planId: string

  @column()
  declare stripeSubscriptionId: string | null

  @column()
  declare stripeCustomerId: string | null

  @column()
  declare stripeSubscriptionItemId: string | null

  @column()
  declare stripePriceId: string | null

  @column()
  declare quantity: number

  @column()
  declare userCount: number

  @column()
  declare billingInterval: PlanInterval

  @column()
  declare price: number

  @column()
  declare currency: string

  @column()
  declare status: SubscriptionStatus

  @column.dateTime()
  declare currentPeriodStart: DateTime | null

  @column.dateTime()
  declare currentPeriodEnd: DateTime | null

  @column.dateTime()
  declare trialEndsAt: DateTime | null

  @column.dateTime()
  declare canceledAt: DateTime | null

  @column.dateTime({ columnName: 'deleted_at' })
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Plan)
  declare plan: BelongsTo<typeof Plan>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
