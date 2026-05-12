import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import type LogRepository from '#logs/repositories/log_repository'
import type { CreateLogData, LogFilters, LogContext } from '#logs/types/log'
import type Log from '#logs/models/log'
import { DateTime } from 'luxon'

@injectable()
export default class LogService {
  constructor(@inject(TYPES.LogRepository) private logRepo: LogRepository) {}

  async createLog(data: CreateLogData): Promise<Log> {
    return this.logRepo.create(data)
  }

  async debug(message: string, context?: LogContext, userId?: string): Promise<Log> {
    return this.createLog({ level: 'debug', message, context, userId })
  }

  async info(message: string, context?: LogContext, userId?: string): Promise<Log> {
    return this.createLog({ level: 'info', message, context, userId })
  }

  async warn(message: string, context?: LogContext, userId?: string): Promise<Log> {
    return this.createLog({ level: 'warn', message, context, userId })
  }

  async error(message: string, context?: LogContext, userId?: string): Promise<Log> {
    return this.createLog({ level: 'error', message, context, userId })
  }

  async fatal(message: string, context?: LogContext, userId?: string): Promise<Log> {
    return this.createLog({ level: 'fatal', message, context, userId })
  }

  async getLogs(
    filters: LogFilters,
    page: number = 1,
    perPage: number = 50
  ): Promise<{ data: Log[]; total: number; page: number; perPage: number }> {
    return this.logRepo.findWithFilters(filters, page, perPage)
  }

  async search(query: string, limit: number = 50): Promise<Log[]> {
    return this.logRepo.search(query, limit)
  }

  async getStats(): Promise<{
    total: number
    byLevel: Record<string, number>
    last24h: number
  }> {
    return this.logRepo.getStats()
  }

  async cleanOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = DateTime.now().minus({ days: daysToKeep })
    return this.logRepo.deleteOlderThan(cutoffDate)
  }
}
