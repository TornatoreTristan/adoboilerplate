import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AdminController = () => import('#admin/controllers/admin_controller')
const PlansController = () => import('#billing/controllers/plans_controller')
const AdminSubscriptionsController = () =>
  import('#admin/controllers/admin_subscriptions_controller')
const MonitoringController = () => import('#admin/controllers/monitoring_controller')
const LogsController = () => import('#admin/controllers/logs_controller')
const AuditLogsController = () => import('#audit/controllers/audit_logs_controller')
const AppSettingsController = () => import('#admin/controllers/app_settings_controller')

router
  .group(() => {
    router.get('/admin', [AdminController, 'index'])
    router.get('/admin/users', [AdminController, 'users'])
    router.get('/admin/users/:id', [AdminController, 'userDetail'])
    router.put('/admin/users/:id', [AdminController, 'updateUser'])
    router.get('/admin/mails', [AdminController, 'mails'])
    router.get('/admin/organizations', [AdminController, 'organizations'])
    router.get('/admin/organizations/:id', [AdminController, 'organizationDetail'])
    router.post('/admin/organizations/:id/members', [AdminController, 'addUserToOrganization'])
    router.get('/admin/roles', [AdminController, 'roles'])
    router.get('/admin/roles/:id', [AdminController, 'roleDetail'])
    router.get('/admin/integrations', [AdminController, 'integrations'])
    router.post('/admin/integrations/stripe', [AdminController, 'configureStripe'])
    router.get('/admin/integrations/stripe/connect', [AdminController, 'stripeConnectAuthorize'])
    router.get('/admin/integrations/stripe/callback', [AdminController, 'stripeConnectCallback'])
    router.post('/admin/integrations/stripe/disconnect', [AdminController, 'stripeDisconnect'])

    router.get('/admin/subscriptions', [AdminController, 'subscriptions'])

    router.get('/admin/plans', [PlansController, 'index'])
    router.get('/admin/plans/create', [PlansController, 'create'])
    router.post('/admin/plans', [PlansController, 'store'])
    router.get('/admin/plans/:id', [PlansController, 'show'])
    router.get('/admin/plans/:id/edit', [PlansController, 'edit'])
    router.put('/admin/plans/:id', [PlansController, 'update'])
    router.delete('/admin/plans/:id', [PlansController, 'destroy'])
    router.post('/admin/plans/:id/sync-stripe', [PlansController, 'syncWithStripe'])
    router.post('/admin/plans/:planId/subscriptions/:subscriptionId/migrate', [
      PlansController,
      'migrateSubscription',
    ])

    // Routes pour gérer les abonnements (Admin)
    router.post('/admin/subscriptions/:id/pause', [AdminSubscriptionsController, 'pause'])
    router.post('/admin/subscriptions/:id/resume', [AdminSubscriptionsController, 'resume'])
    router.post('/admin/subscriptions/:id/cancel', [AdminSubscriptionsController, 'cancel'])
    router.post('/admin/subscriptions/:id/reactivate', [AdminSubscriptionsController, 'reactivate'])

    // Routes pour le monitoring système
    router.get('/admin/monitoring', [MonitoringController, 'index'])
    router.get('/api/admin/monitoring/data', [MonitoringController, 'data'])
    router.get('/api/admin/monitoring/history', [MonitoringController, 'history'])

    // Routes pour les logs
    router.get('/admin/logs', [LogsController, 'index'])
    router.get('/api/admin/logs/list', [LogsController, 'list'])
    router.get('/api/admin/logs/stats', [LogsController, 'stats'])

    // Routes pour les audit logs
    router.get('/admin/audit-logs', [AuditLogsController, 'index'])
    router.get('/admin/audit-logs/:id', [AuditLogsController, 'show'])
    router.get('/api/admin/audit-logs/stats', [AuditLogsController, 'stats'])
    router.get('/api/admin/audit-logs/search', [AuditLogsController, 'search'])
    router.get('/api/admin/audit-logs/recent', [AuditLogsController, 'recent'])
    router.get('/api/admin/audit-logs/user/:userId', [AuditLogsController, 'userLogs'])
    router.get('/api/admin/audit-logs/organization/:organizationId', [
      AuditLogsController,
      'organizationLogs',
    ])
    router.get('/api/admin/audit-logs/resource/:resourceType/:resourceId', [
      AuditLogsController,
      'resourceLogs',
    ])

    // Routes pour les paramètres de l'application
    router.get('/admin/settings', [AppSettingsController, 'index'])
    router.post('/admin/settings/branding', [AppSettingsController, 'updateBranding'])
    router.post('/admin/settings/legal', [AppSettingsController, 'updateLegal'])
    router.post('/admin/settings/logo', [AppSettingsController, 'uploadLogo'])
    router.post('/admin/settings/favicon', [AppSettingsController, 'uploadFavicon'])
  })
  .use([middleware.auth(), middleware.superAdmin()])
