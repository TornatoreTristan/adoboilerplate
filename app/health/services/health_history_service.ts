import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import { DateTime } from 'luxon'
import type HealthHistoryRepository from '#health/repositories/health_history_repository'
import type HealthHistory from '#health/models/health_history'
import type { HealthStatus } from '#health/types/health'
import type { MonitoringHealth, MonitoringMetrics } from './monitoring_service.js'

@injectable()
export default class HealthHistoryService {
  constructor(
    @inject(TYPES.HealthHistoryRepository) private historyRepo: HealthHistoryRepository
  ) {}

  async saveSnapshot(
    status: HealthStatus,
    healthData: MonitoringHealth,
    metricsData: MonitoringMetrics
  ): Promise<HealthHistory> {
    return this.historyRepo.create({
      status,
      healthData,
      metricsData,
    } as Partial<HealthHistory>)
  }

  async getRecentHistory(limit: number = 100): Promise<HealthHistory[]> {
    return this.historyRepo.getHistory(limit)
  }

  async getHistorySince(since: DateTime, limit: number = 1000): Promise<HealthHistory[]> {
    return this.historyRepo.getHistorySince(since, limit)
  }

  async getHistoryForPeriod(startDate: DateTime, endDate: DateTime): Promise<HealthHistory[]> {
    return this.historyRepo.getHistoryForPeriod(startDate, endDate)
  }

  async getLast24Hours(): Promise<HealthHistory[]> {
    const since = DateTime.now().minus({ hours: 24 })
    return this.historyRepo.getHistorySince(since, 1440)
  }

  async cleanOldHistory(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = DateTime.now().minus({ days: daysToKeep })
    return this.historyRepo.deleteOlderThan(cutoffDate)
  }
}
