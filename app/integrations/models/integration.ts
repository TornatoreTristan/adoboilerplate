import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import encryption from '@adonisjs/core/services/encryption'

export default class Integration extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare provider: string

  @column()
  declare isActive: boolean

  @column({
    prepare: (value: Record<string, unknown>) =>
      value && Object.keys(value).length > 0 ? encryption.encrypt(JSON.stringify(value)) : null,
    consume: (value: string | null) => {
      if (!value) return {}
      try {
        const decrypted = encryption.decrypt<string>(value)
        return decrypted ? (JSON.parse(decrypted) as Record<string, unknown>) : {}
      } catch {
        return {}
      }
    },
  })
  declare config: Record<string, unknown>

  @column({
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | Record<string, unknown> | null) => {
      if (value === null || value === undefined) return null
      if (typeof value === 'string') {
        return value ? (JSON.parse(value) as Record<string, unknown>) : null
      }
      return value || null
    },
  })
  declare metadata: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
