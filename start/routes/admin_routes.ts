import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AdminDashboardController = () => import('#admin/controllers/admin_dashboard_controller')
const AdminUsersController = () => import('#admin/controllers/admin_users_controller')
const AdminMailsController = () => import('#admin/controllers/admin_mails_controller')
const AdminOrganizationsController = () =>
  import('#admin/controllers/admin_organizations_controller')
const AdminRolesController = () => import('#admin/controllers/admin_roles_controller')
const AdminIntegrationsController = () => import('#admin/controllers/admin_integrations_controller')
const AdminSubscriptionsController = () =>
  import('#admin/controllers/admin_subscriptions_controller')
const PlansController = () => import('#billing/controllers/plans_controller')
const MonitoringController = () => import('#admin/controllers/monitoring_controller')
const LogsController = () => import('#admin/controllers/logs_controller')
const AuditLogsController = () => import('#audit/controllers/audit_logs_controller')
const AppSettingsController = () => import('#admin/controllers/app_settings_controller')
const AdminQueuesController = () => import('#admin/controllers/admin_queues_controller')

router
  .group(() => {
    router.get('/admin', [AdminDashboardController, 'index'])

    // Users
    router.get('/admin/users', [AdminUsersController, 'users'])
    router.get('/admin/users/:id', [AdminUsersController, 'userDetail'])
    router.put('/admin/users/:id', [AdminUsersController, 'updateUser'])

    // Mails
    router.get('/admin/mails', [AdminMailsController, 'index'])

    // Organizations
    router.get('/admin/organizations', [AdminOrganizationsController, 'organizations'])
    router.get('/admin/organizations/:id', [AdminOrganizationsController, 'organizationDetail'])
    router.post('/admin/organizations/:id/members', [
      AdminOrganizationsController,
      'addUserToOrganization',
    ])

    // Roles
    router.get('/admin/roles', [AdminRolesController, 'roles'])
    router.get('/admin/roles/:id', [AdminRolesController, 'roleDetail'])

    // Integrations (Stripe)
    router.get('/admin/integrations', [AdminIntegrationsController, 'integrations'])
    router.post('/admin/integrations/stripe', [AdminIntegrationsController, 'configureStripe'])
    router.get('/admin/integrations/stripe/connect', [
      AdminIntegrationsController,
      'stripeConnectAuthorize',
    ])
    router.get('/admin/integrations/stripe/callback', [
      AdminIntegrationsController,
      'stripeConnectCallback',
    ])
    router.post('/admin/integrations/stripe/disconnect', [
      AdminIntegrationsController,
      'stripeDisconnect',
    ])

    // Subscriptions
    router.get('/admin/subscriptions', [AdminSubscriptionsController, 'subscriptions'])
    router.post('/admin/subscriptions/:id/pause', [AdminSubscriptionsController, 'pause'])
    router.post('/admin/subscriptions/:id/resume', [AdminSubscriptionsController, 'resume'])
    router.post('/admin/subscriptions/:id/cancel', [AdminSubscriptionsController, 'cancel'])
    router.post('/admin/subscriptions/:id/reactivate', [AdminSubscriptionsController, 'reactivate'])

    // Plans
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

    // Monitoring
    router.get('/admin/monitoring', [MonitoringController, 'index'])
    router.get('/api/admin/monitoring/data', [MonitoringController, 'data'])
    router.get('/api/admin/monitoring/history', [MonitoringController, 'history'])

    // Logs
    router.get('/admin/logs', [LogsController, 'index'])
    router.get('/api/admin/logs/list', [LogsController, 'list'])
    router.get('/api/admin/logs/stats', [LogsController, 'stats'])

    // Audit logs
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

    // App settings
    router.get('/admin/settings', [AppSettingsController, 'index'])
    router.post('/admin/settings/branding', [AppSettingsController, 'updateBranding'])
    router.post('/admin/settings/legal', [AppSettingsController, 'updateLegal'])
    router.post('/admin/settings/logo', [AppSettingsController, 'uploadLogo'])
    router.post('/admin/settings/favicon', [AppSettingsController, 'uploadFavicon'])

    // Queues
    router.get('/admin/queues', [AdminQueuesController, 'index'])
    router.get('/admin/queues/:name', [AdminQueuesController, 'show'])
    router.post('/admin/queues/:name/jobs/:id/retry', [AdminQueuesController, 'retry'])
    router.post('/admin/queues/:name/jobs/:id/remove', [AdminQueuesController, 'remove'])
    router.post('/admin/queues/:name/pause', [AdminQueuesController, 'pause'])
    router.post('/admin/queues/:name/resume', [AdminQueuesController, 'resume'])
  })
  .use([middleware.auth(), middleware.superAdmin()])
