import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Integration extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare provider: string

  @column()
  declare isActive: boolean

  @column({
    prepare: (value: Record<string, any>) => JSON.stringify(value),
    consume: (value: string | Record<string, any>) => {
      if (typeof value === 'string') {
        return value ? JSON.parse(value) : {}
      }
      return value || {}
    },
  })
  declare config: Record<string, any>

  @column({
    prepare: (value: Record<string, any> | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | Record<string, any> | null) => {
      if (value === null) return null
      if (typeof value === 'string') {
        return value ? JSON.parse(value) : null
      }
      return value || null
    },
  })
  declare metadata: Record<string, any> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
