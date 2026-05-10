import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserNotificationPreferenceService from '#notifications/services/user_notification_preference_service'
import type { NotificationType } from '#notifications/types/notification'
import type { NotificationChannel } from '#notifications/models/user_notification_preference'
import vine from '@vinejs/vine'

export default class UserNotificationPreferencesController {
  /**
   * GET /api/notifications/preferences
   * Récupère toutes les préférences de notification de l'utilisateur
   */
  async index({ response, session }: HttpContext) {
    const userId = session.get('user_id')
    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const preferenceService = getService<UserNotificationPreferenceService>(
      TYPES.UserNotificationPreferenceService
    )

    const preferences = await preferenceService.getUserPreferences(userId)

    return response.json({
      preferences: preferences.map((p) => ({
        id: p.id,
        notification_type: p.notificationType,
        channel: p.channel,
        enabled: p.enabled,
      })),
    })
  }

  /**
   * POST /api/notifications/preferences/initialize
   * Initialise les préférences par défaut pour l'utilisateur
   */
  async initialize({ response, session }: HttpContext) {
    const userId = session.get('user_id')
    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const preferenceService = getService<UserNotificationPreferenceService>(
      TYPES.UserNotificationPreferenceService
    )

    await preferenceService.initializeDefaultPreferences(userId)

    return response.json({
      message: 'Préférences initialisées avec succès',
    })
  }

  /**
   * PATCH /api/notifications/preferences
   * Met à jour une préférence spécifique
   */
  async update({ request, response, session }: HttpContext) {
    const userId = session.get('user_id')
    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    // Validation
    const updatePreferenceSchema = vine.compile(
      vine.object({
        notification_type: vine.string(),
        channel: vine.enum(['in_app', 'email', 'push'] as const),
        enabled: vine.boolean(),
      })
    )

    const data = await request.validateUsing(updatePreferenceSchema)

    const preferenceService = getService<UserNotificationPreferenceService>(
      TYPES.UserNotificationPreferenceService
    )

    const preference = await preferenceService.setPreference(
      userId,
      data.notification_type as NotificationType,
      data.channel as NotificationChannel,
      data.enabled
    )

    return response.json({
      preference: {
        id: preference.id,
        notification_type: preference.notificationType,
        channel: preference.channel,
        enabled: preference.enabled,
      },
    })
  }

  /**
   * POST /api/notifications/preferences/bulk
   * Met à jour plusieurs préférences en une seule fois
   */
  async bulkUpdate({ request, response, session }: HttpContext) {
    const userId = session.get('user_id')
    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    // Validation
    const bulkUpdateSchema = vine.compile(
      vine.object({
        preferences: vine.array(
          vine.object({
            notification_type: vine.string(),
            channel: vine.enum(['in_app', 'email', 'push'] as const),
            enabled: vine.boolean(),
          })
        ),
      })
    )

    const data = await request.validateUsing(bulkUpdateSchema)

    const preferenceService = getService<UserNotificationPreferenceService>(
      TYPES.UserNotificationPreferenceService
    )

    const preferences = await preferenceService.updateBulkPreferences(
      userId,
      data.preferences.map((p) => ({
        notificationType: p.notification_type as NotificationType,
        channel: p.channel as NotificationChannel,
        enabled: p.enabled,
      }))
    )

    return response.json({
      preferences: preferences.map((p) => ({
        id: p.id,
        notification_type: p.notificationType,
        channel: p.channel,
        enabled: p.enabled,
      })),
    })
  }
}
