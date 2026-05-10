import type { ApplicationService } from '@adonisjs/core/types'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type NotificationListeners from '#notifications/listeners/notification_listeners'

/**
 * NotificationListenersProvider
 *
 * Enregistre automatiquement les listeners de notifications au démarrage de l'application
 */
export default class NotificationListenersProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Enregistrer les listeners au démarrage
   */
  async boot() {
    try {
      // Récupérer le listener depuis le container
      const listeners = getService<NotificationListeners>(TYPES.NotificationListeners)

      // Enregistrer tous les listeners
      listeners.register()
    } catch (err) {
      console.error('Failed to boot notification listeners provider:', err)
      // Ne pas throw pour ne pas bloquer le démarrage
    }
  }

  /**
   * Nettoyer les listeners à l'arrêt
   */
  async shutdown() {
    try {
      const listeners = getService<NotificationListeners>(TYPES.NotificationListeners)
      listeners.unregisterAll()
    } catch (err) {
      console.error('Failed to shutdown notification listeners provider:', err)
    }
  }
}
