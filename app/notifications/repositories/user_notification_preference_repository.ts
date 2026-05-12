import { injectable } from 'inversify'
import { BaseRepository } from '#shared/repositories/base_repository'
import UserNotificationPreference from '#notifications/models/user_notification_preference'
import type { NotificationType } from '#notifications/types/notification'
import type { NotificationChannel } from '#notifications/models/user_notification_preference'

@injectable()
export default class UserNotificationPreferenceRepository extends BaseRepository<
  typeof UserNotificationPreference
> {
  protected model = UserNotificationPreference

  async findByUserId(userId: string): Promise<UserNotificationPreference[]> {
    return this.findBy({ userId })
  }

  async findByUserAndType(
    userId: string,
    notificationType: NotificationType,
    channel: NotificationChannel
  ): Promise<UserNotificationPreference | null> {
    return this.findOneBy({
      userId,
      notificationType,
      channel,
    })
  }

  async isEnabled(
    userId: string,
    notificationType: NotificationType,
    channel: NotificationChannel
  ): Promise<boolean> {
    const preference = await this.findByUserAndType(userId, notificationType, channel)

    // Si pas de préférence définie, on considère que c'est activé par défaut
    if (!preference) {
      return true
    }

    return preference.enabled
  }

  async setPreference(
    userId: string,
    notificationType: NotificationType,
    channel: NotificationChannel,
    enabled: boolean
  ): Promise<UserNotificationPreference> {
    const existing = await this.findByUserAndType(userId, notificationType, channel)

    if (existing) {
      return this.update(existing.id, { enabled })
    }

    return this.create({
      userId,
      notificationType,
      channel,
      enabled,
    })
  }

  async initializeDefaultPreferences(userId: string): Promise<void> {
    const notificationTypes: NotificationType[] = [
      'user.mentioned',
      'org.invitation',
      'org.member_joined',
      'org.member_left',
      'system.announcement',
      'system.maintenance',
    ]

    const channels: NotificationChannel[] = ['in_app', 'email', 'push']

    for (const notificationType of notificationTypes) {
      for (const channel of channels) {
        const existing = await this.findByUserAndType(userId, notificationType, channel)
        if (!existing) {
          await this.create({
            userId,
            notificationType,
            channel,
            enabled: true,
          })
        }
      }
    }
  }
}
