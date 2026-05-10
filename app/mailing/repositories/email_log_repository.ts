import { injectable } from 'inversify'
import { DateTime } from 'luxon'
import EmailLog from '#mailing/models/email_log'
import type { EmailLogStatus } from '#mailing/models/email_log'
import { BaseRepository } from '#shared/repositories/base_repository'

export interface EmailLogFilters {
  page?: number
  perPage?: number
  status?: EmailLogStatus
  category?: string
  search?: string
}

export interface PaginatedEmailLogs {
  data: EmailLog[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

export interface EmailLogStatusCounts {
  total: number
  sent: number
  failed: number
  delivered: number
  pending: number
}

@injectable()
export default class EmailLogRepository extends BaseRepository<typeof EmailLog> {
  protected model = EmailLog

  async findByUserId(userId: string | number): Promise<EmailLog[]> {
    return this.findBy(
      { user_id: userId },
      {
        cache: { ttl: 300, tags: ['email_logs', `user_email_logs_${userId}`] },
      }
    )
  }

  async findByStatus(status: EmailLogStatus): Promise<EmailLog[]> {
    return this.findBy(
      { status },
      {
        cache: { ttl: 300, tags: ['email_logs', `status_${status}`] },
      }
    )
  }

  async findByCategory(category: string): Promise<EmailLog[]> {
    return this.findBy(
      { category },
      {
        cache: { ttl: 300, tags: ['email_logs', `category_${category}`] },
      }
    )
  }

  async findByDateRange(startDate: DateTime, endDate: DateTime): Promise<EmailLog[]> {
    const query = this.buildBaseQuery()

    return query
      .whereBetween('created_at', [startDate.toJSDate(), endDate.toJSDate()])
      .orderBy('created_at', 'desc')
  }

  async findPaginatedWithFilters(filters: EmailLogFilters = {}): Promise<PaginatedEmailLogs> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = this.buildBaseQuery()

    if (filters.status) {
      query.where('status', filters.status)
    }
    if (filters.category) {
      query.where('category', filters.category)
    }
    if (filters.search) {
      query.where('recipient', 'LIKE', `%${filters.search}%`)
    }

    const totalResult = await query.clone().count('* as total')
    const total = Number(totalResult[0].$extras.total)

    const data = await query
      .orderBy('created_at', 'desc')
      .offset((page - 1) * perPage)
      .limit(perPage)

    return {
      data,
      meta: {
        total,
        perPage,
        currentPage: page,
        lastPage: Math.ceil(total / perPage),
      },
    }
  }

  async getStatusCounts(): Promise<EmailLogStatusCounts> {
    const rows = await this.buildBaseQuery().select('status').count('* as count').groupBy('status')

    const counts: EmailLogStatusCounts = {
      total: 0,
      sent: 0,
      failed: 0,
      delivered: 0,
      pending: 0,
    }

    for (const row of rows) {
      const r: any = row
      const c = Number(r.$extras?.count ?? 0)
      counts.total += c
      if (r.status in counts) {
        ;(counts as any)[r.status] = c
      }
    }

    return counts
  }

  async getStatsByCategory(): Promise<{ category: string; count: number }[]> {
    const query = this.buildBaseQuery()

    const results = await query
      .select('category')
      .count('* as count')
      .groupBy('category')
      .orderBy('count', 'desc')

    return results.map((row) => ({
      category: row.category,
      count: Number(row.$extras.count),
    }))
  }

  async updateStatus(id: string | number, status: EmailLogStatus): Promise<EmailLog> {
    const updates: Record<string, any> = { status }

    if (status === 'sent') {
      updates.sent_at = DateTime.now()
    } else if (status === 'delivered') {
      updates.delivered_at = DateTime.now()
    } else if (status === 'failed') {
      updates.failed_at = DateTime.now()
    }

    return this.update(id, updates)
  }

  async trackOpen(id: string | number): Promise<EmailLog> {
    const log = await this.findById(id)
    if (!log) {
      throw new Error('Email log not found')
    }

    const updates: Record<string, any> = {
      opens_count: log.opensCount + 1,
      status: 'opened',
    }

    if (!log.openedAt) {
      updates.opened_at = DateTime.now()
    }

    return this.update(id, updates)
  }

  async trackClick(id: string | number): Promise<EmailLog> {
    const log = await this.findById(id)
    if (!log) {
      throw new Error('Email log not found')
    }

    const updates: Record<string, any> = {
      clicks_count: log.clicksCount + 1,
      status: 'clicked',
    }

    if (!log.clickedAt) {
      updates.clicked_at = DateTime.now()
    }

    return this.update(id, updates)
  }

  protected async afterCreate(log: EmailLog): Promise<void> {
    await super.afterCreate(log)
    await this.cache?.invalidateTags([
      'email_logs',
      `category_${log.category}`,
      `status_${log.status}`,
    ])
    if (log.userId) {
      await this.cache?.invalidateTags([`user_email_logs_${log.userId}`])
    }
  }

  protected async afterUpdate(log: EmailLog): Promise<void> {
    await super.afterUpdate(log)
    await this.cache?.invalidateTags([
      'email_logs',
      `category_${log.category}`,
      `status_${log.status}`,
    ])
    if (log.userId) {
      await this.cache?.invalidateTags([`user_email_logs_${log.userId}`])
    }
  }

  protected async afterDelete(log: EmailLog): Promise<void> {
    await super.afterDelete(log)
    await this.cache?.invalidateTags(['email_logs', `category_${log.category}`])
    if (log.userId) {
      await this.cache?.invalidateTags([`user_email_logs_${log.userId}`])
    }
  }
}
