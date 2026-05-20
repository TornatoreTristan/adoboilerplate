import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class StripeWebhookEvent extends BaseModel {
  static table = 'stripe_webhook_events'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare eventId: string

  @column()
  declare eventType: string

  @column.dateTime()
  declare processedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
