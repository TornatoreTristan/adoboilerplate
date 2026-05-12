import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { HealthStatus } from '#health/types/health'
import type {
  MonitoringHealth,
  MonitoringMetrics,
} from '#health/services/monitoring_service'

export default class HealthHistory extends BaseModel {
  static table = 'health_history'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare status: HealthStatus

  @column({
    prepare: (value: MonitoringHealth) => JSON.stringify(value),
    consume: (value: string | MonitoringHealth) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare healthData: MonitoringHealth

  @column({
    prepare: (value: MonitoringMetrics) => JSON.stringify(value),
    consume: (value: string | MonitoringMetrics) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare metricsData: MonitoringMetrics

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
