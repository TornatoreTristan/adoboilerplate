import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Subscription from './subscription.js'
import type { TranslatableField, TranslatableFieldNullable } from '#shared/helpers/translatable'

export type PlanInterval = 'month' | 'year'
export type PricingModel = 'flat' | 'per_seat' | 'tiered' | 'volume'

export interface PricingTier {
  minUsers: number
  maxUsers: number | null
  price?: number
  pricePerUser?: number
}

export default class Plan extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column({
    columnName: 'name_i18n',
    prepare: (value: TranslatableField) => JSON.stringify(value),
    consume: (value: string | TranslatableField) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare nameI18n: TranslatableField

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
  declare stripeProductId: string | null

  @column()
  declare stripePriceIdMonthly: string | null

  @column()
  declare stripePriceIdYearly: string | null

  @column()
  declare priceMonthly: number

  @column()
  declare priceYearly: number

  @column()
  declare currency: string

  @column()
  declare pricingModel: PricingModel

  @column({
    prepare: (value: PricingTier[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | PricingTier[] | null) => {
      if (value === null) return null
      if (typeof value === 'string') {
        return value ? JSON.parse(value) : null
      }
      return value || null
    },
  })
  declare pricingTiers: PricingTier[] | null

  @column()
  declare trialDays: number | null

  @column({
    columnName: 'features_i18n',
    prepare: (value: TranslatableFieldNullable | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | TranslatableFieldNullable | null) => {
      if (value === null) return null
      return typeof value === 'string' ? JSON.parse(value) : value
    },
  })
  declare featuresI18n: TranslatableFieldNullable | null

  @column({
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | Record<string, unknown> | null) => {
      if (value === null) return null
      if (typeof value === 'string') {
        return value ? JSON.parse(value) : null
      }
      return value || null
    },
  })
  declare limits: Record<string, unknown> | null

  @column()
  declare isActive: boolean

  @column()
  declare isVisible: boolean

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => Subscription)
  declare subscriptions: HasMany<typeof Subscription>

  // Getters for backward compatibility
  get name(): string {
    return this.nameI18n?.fr || this.nameI18n?.en || ''
  }

  get description(): string | null {
    return this.descriptionI18n?.fr || this.descriptionI18n?.en || null
  }

  get features(): string[] | null {
    if (!this.featuresI18n) return null
    const featuresStr = this.featuresI18n.fr || this.featuresI18n.en
    if (!featuresStr) return null
    return featuresStr.split(', ').filter((f) => f.trim() !== '')
  }
}
