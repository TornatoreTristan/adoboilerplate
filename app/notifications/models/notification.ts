import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, beforeCreate } from '@adonisjs/lucid/orm'
import User from '#users/models/user'
import Organization from '#organizations/models/organization'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type {
  NotificationType,
  NotificationPriority,
  NotificationAction,
} from '#notifications/types/notification'
import type { TranslatableField } from '#shared/helpers/translatable'

export default class Notification extends BaseModel {
  @beforeCreate()
  static assignDefaults(notification: Notification) {
    if (!notification.priority) {
      notification.priority = 'normal'
    }
  }
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare organizationId: string | null

  @column()
  declare type: NotificationType

  @column()
  declare priority: NotificationPriority

  @column({ columnName: 'title_i18n' })
  declare titleI18n: TranslatableField

  @column({ columnName: 'message_i18n' })
  declare messageI18n: TranslatableField

  @column()
  declare data: Record<string, any> | null

  @column({
    prepare: (value: NotificationAction[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | NotificationAction[] | null | any) => {
      if (value === null || value === undefined) return null
      if (Array.isArray(value)) return value
      if (typeof value === 'object') return value
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch {
          return null
        }
      }
      return null
    },
  })
  declare actions: NotificationAction[] | null

  @column.dateTime()
  declare readAt: DateTime | null

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

  get isRead(): boolean {
    return this.readAt !== null
  }

  get isUnread(): boolean {
    return this.readAt === null
  }

  // Getters for backward compatibility
  get title(): string {
    return this.titleI18n?.fr || this.titleI18n?.en || ''
  }

  get message(): string {
    return this.messageI18n?.fr || this.messageI18n?.en || ''
  }
}
