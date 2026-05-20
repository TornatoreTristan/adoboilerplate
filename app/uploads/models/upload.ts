import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import User from '#users/models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DiskType, VisibilityType, UploadMetadata } from '#uploads/types/upload'

export default class Upload extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare filename: string

  @column()
  declare storagePath: string

  @column()
  declare disk: DiskType

  @column()
  declare mimeType: string

  @column()
  declare size: number

  @column()
  declare visibility: VisibilityType

  @column()
  declare uploadableType: string | null

  @column()
  declare uploadableId: string | null

  @column({
    prepare: (value: UploadMetadata | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | UploadMetadata | null) => {
      if (!value) return null
      if (typeof value === 'string') return JSON.parse(value)
      return value
    },
  })
  declare metadata: UploadMetadata | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime({ columnName: 'deleted_at' })
  declare deletedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  get isPublic(): boolean {
    return this.visibility === 'public'
  }

  get isPrivate(): boolean {
    return this.visibility === 'private'
  }

  get isImage(): boolean {
    return this.mimeType.startsWith('image/')
  }

  get isPdf(): boolean {
    return this.mimeType === 'application/pdf'
  }

  get sizeInKb(): number {
    return Math.round(this.size / 1024)
  }

  get sizeInMb(): number {
    return Math.round((this.size / 1024 / 1024) * 100) / 100
  }

  get url(): string {
    // For public files, return the public URL path
    if (this.isPublic) {
      return `/uploads/${this.storagePath}`
    }
    // For private files, return API endpoint
    return `/api/uploads/${this.id}`
  }
}
