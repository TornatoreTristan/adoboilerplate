import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import User from '#users/models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export type EmailLogStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'delivery_delayed'
  | 'bounced'
  | 'complained'
  | 'opened'
  | 'clicked'
  | 'failed'
  | 'received'

export interface AttachmentMetadata {
  filename: string
  contentType: string
  size?: number
}

export interface BounceData {
  type?: string
  subType?: string
  message?: string
}

export interface ComplaintData {
  feedbackType?: string
}

export default class EmailLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string | null

  @column()
  declare recipient: string

  @column()
  declare subject: string

  @column()
  declare category: string

  @column()
  declare status: EmailLogStatus

  @column()
  declare providerId: string | null

  @column()
  declare errorMessage: string | null

  @column()
  declare opensCount: number

  @column()
  declare clicksCount: number

  @column.dateTime()
  declare openedAt: DateTime | null

  @column.dateTime()
  declare clickedAt: DateTime | null

  @column({
    prepare: (value: Record<string, any> | null) =>
      value ? (typeof value === 'string' ? value : JSON.stringify(value)) : null,
    consume: (value: unknown) => (value && typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare metadata: Record<string, any> | null

  @column({
    prepare: (value: AttachmentMetadata[] | null) =>
      value ? (typeof value === 'string' ? value : JSON.stringify(value)) : null,
    consume: (value: unknown) => (value && typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare attachmentsMetadata: AttachmentMetadata[] | null

  @column({
    prepare: (value: BounceData | null) =>
      value ? (typeof value === 'string' ? value : JSON.stringify(value)) : null,
    consume: (value: unknown) => (value && typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare bounceData: BounceData | null

  @column({
    prepare: (value: ComplaintData | null) =>
      value ? (typeof value === 'string' ? value : JSON.stringify(value)) : null,
    consume: (value: unknown) => (value && typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare complaintData: ComplaintData | null

  @column.dateTime()
  declare sentAt: DateTime | null

  @column.dateTime()
  declare deliveredAt: DateTime | null

  @column.dateTime()
  declare failedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  get isSuccess(): boolean {
    return this.status === 'sent' || this.status === 'delivered'
  }

  get isFailed(): boolean {
    return this.status === 'failed' || this.status === 'bounced'
  }

  get isPending(): boolean {
    return this.status === 'pending' || this.status === 'received'
  }

  get hasAttachments(): boolean {
    return !!this.attachmentsMetadata && this.attachmentsMetadata.length > 0
  }

  get wasOpened(): boolean {
    return this.status === 'opened' || this.opensCount > 0
  }

  get wasClicked(): boolean {
    return this.status === 'clicked' || this.clicksCount > 0
  }
}
