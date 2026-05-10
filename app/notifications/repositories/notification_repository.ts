import { injectable } from 'inversify'
import { BaseRepository } from '#shared/repositories/base_repository'
import Notification from '#notifications/models/notification'
import { DateTime } from 'luxon'

@injectable()
export default class NotificationRepository extends BaseRepository<typeof Notification> {
  protected model = Notification

  async findByUserId(userId: string): Promise<Notification[]> {
    return this.findBy({ userId })
  }

  async findByUserIdSortedByPriority(userId: string): Promise<Notification[]> {
    return this.buildBaseQuery()
      .where('user_id', userId)
      .orderByRaw(`
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END ASC
      `)
      .orderBy('created_at', 'desc')
  }

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    return this.buildBaseQuery().where('user_id', userId).whereNull('read_at')
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    const query = this.buildBaseQuery()
      .where('user_id', userId)
      .whereNull('read_at')

    const result = await query.count('* as total')
    const row = result[0] as { $extras?: { total?: string | number } } | undefined
    return Number(row?.$extras?.total ?? 0)
  }

  async markAsRead(id: string): Promise<void> {
    await this.update(id, { readAt: DateTime.now() } as any)
  }

  async markAsReadBulk(ids: string[]): Promise<number> {
    await this.buildBaseQuery()
      .whereIn('id', ids)
      .update({ read_at: DateTime.now().toSQL() })

    await this.invalidateListCaches()

    return ids.length
  }

  async markAsUnread(id: string): Promise<void> {
    await this.update(id, { readAt: null } as any)
  }
}
