import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const NotificationsController = () => import('#notifications/controllers/notifications_controller')
const UserNotificationPreferencesController = () =>
  import('#notifications/controllers/user_notification_preferences_controller')
const TestNotificationController = () =>
  import('#notifications/controllers/test_notification_controller')

router
  .group(() => {
    router.get('/notifications', [NotificationsController, 'index']).as('api.notifications.index')
    router.get('/notifications/unread-count', [NotificationsController, 'unreadCount'])
    router.patch('/notifications/mark-all-read', [NotificationsController, 'markAllAsRead'])
    router.patch('/notifications/:id/read', [NotificationsController, 'markAsRead'])
    router.post('/notifications/:id/actions/:actionIndex', [
      NotificationsController,
      'executeAction',
    ])
    router.delete('/notifications/:id', [NotificationsController, 'destroy'])

    // Routes pour les préférences de notification
    router.get('/notifications/preferences', [UserNotificationPreferencesController, 'index'])
    router.post('/notifications/preferences/initialize', [
      UserNotificationPreferencesController,
      'initialize',
    ])
    router.patch('/notifications/preferences', [UserNotificationPreferencesController, 'update'])
    router.post('/notifications/preferences/bulk', [
      UserNotificationPreferencesController,
      'bulkUpdate',
    ])

    // Route de test pour vérifier Transmit
    router.post('/notifications/test', [TestNotificationController, 'create'])
  })
  .prefix('/api')
  .use([middleware.auth(), middleware.updateSessionActivity()])
