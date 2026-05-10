import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type NotificationService from '#notifications/services/notification_service'
import type { NotificationType } from '#notifications/types/notification'

export default class NotificationsController {
  async index({ request, response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const notificationService = getService<NotificationService>(TYPES.NotificationService)

    const unreadOnly = request.input('unread') === 'true'
    const type = request.input('type') as NotificationType | undefined

    const notifications = await notificationService.getUserNotifications(userId, {
      unreadOnly,
      type,
    })

    const unreadCount = await notificationService.getUnreadCount(userId)

    // Trier : non lues en premier, puis par date décroissante
    const sortedNotifications = notifications.sort((a, b) => {
      if (!a.readAt && b.readAt) return -1
      if (a.readAt && !b.readAt) return 1
      return b.createdAt.toMillis() - a.createdAt.toMillis()
    })

    const serializedNotifications = sortedNotifications.map((n) => ({
      id: n.id,
      type: n.type,
      priority: n.priority,
      titleI18n: n.titleI18n,
      messageI18n: n.messageI18n,
      data: n.data,
      actions: n.actions,
      readAt: n.readAt ? n.readAt.toISO() : null,
      createdAt: n.createdAt.toISO(),
    }))

    return response.json({
      notifications: serializedNotifications,
      unreadCount,
    })
  }

  async unreadCount({ response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const notificationService = getService<NotificationService>(TYPES.NotificationService)
    const count = await notificationService.getUnreadCount(userId)

    return response.json({ count })
  }

  async markAsRead({ params, response, session }: HttpContext) {
    const userId = session.get('user_id')
    const notificationId = params.id

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const notificationService = getService<NotificationService>(TYPES.NotificationService)

    const notifications = await notificationService.getUserNotifications(userId)
    const notification = notifications.find((n) => n.id === notificationId)

    if (!notification) {
      return response.status(403).json({ error: 'Non autorisé' })
    }

    await notificationService.markAsRead(notificationId)

    return response.json({ success: true })
  }

  async markAllAsRead({ response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const notificationService = getService<NotificationService>(TYPES.NotificationService)
    const count = await notificationService.markAllAsReadForUser(userId)

    return response.json({ success: true, count })
  }

  async destroy({ params, response, session }: HttpContext) {
    const userId = session.get('user_id')
    const notificationId = params.id

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const notificationService = getService<NotificationService>(TYPES.NotificationService)

    const notifications = await notificationService.getUserNotifications(userId)
    const notification = notifications.find((n) => n.id === notificationId)

    if (!notification) {
      return response.status(403).json({ error: 'Non autorisé' })
    }

    await notificationService.deleteNotification(notificationId)

    return response.json({ success: true })
  }

  async executeAction({ params, response, session }: HttpContext) {
    const userId = session.get('user_id')
    const notificationId = params.id
    const actionIndex = Number.parseInt(params.actionIndex, 10)

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    if (Number.isNaN(actionIndex)) {
      return response.status(400).json({ error: 'Invalid action index' })
    }

    const notificationService = getService<NotificationService>(TYPES.NotificationService)

    try {
      const result = await notificationService.executeNotificationAction(
        notificationId,
        actionIndex,
        userId
      )

      return response.json(result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return response.status(400).json({ error: errorMessage })
    }
  }
}
