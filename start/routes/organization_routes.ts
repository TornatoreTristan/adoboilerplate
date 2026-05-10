import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const OrganizationsController = () => import('#organizations/controllers/organizations_controller')
const OrganizationSettingsController = () =>
  import('#organizations/controllers/organization_settings_controller')
const OrganizationInvitationsController = () =>
  import('#organizations/controllers/organization_invitations_controller')
const SubscriptionsController = () => import('#billing/controllers/subscriptions_controller')

// Organization creation route - accessible even without existing organization
router
  .get('/organizations/create', async ({ inertia }) => {
    return inertia.render('organizations/create', {})
  })
  .use([middleware.auth()])

// Organization form submission
router.post('/organizations', [OrganizationsController, 'store']).use([middleware.auth()])

// Organization invitations - public route (with auth check inside)
router.get('/organizations/invitations/:token/accept', [
  OrganizationInvitationsController,
  'accept',
])

// Post-auth invitation handler
router
  .get('/organizations/invitations/post-auth', [
    OrganizationInvitationsController,
    'handlePostAuth',
  ])
  .use([middleware.auth()])

// Routes de retour Stripe - publiques (Stripe redirige ici) - AVANT les autres routes
router.get('/organizations/subscriptions/success', [SubscriptionsController, 'success'])
router.get('/organizations/subscriptions/cancel', [SubscriptionsController, 'cancel'])

// Organization settings pages - requires authentication and organization context
router
  .group(() => {
    router.get('/settings', [OrganizationSettingsController, 'index'])
    router.put('/settings', [OrganizationSettingsController, 'update'])
    router.post('/settings/logo', [OrganizationSettingsController, 'uploadLogo'])
    router.get('/settings/integrations', [OrganizationSettingsController, 'integrations'])
    router.get('/settings/users', [OrganizationSettingsController, 'users'])
    router.post('/settings/users/invite', [OrganizationSettingsController, 'inviteMember'])
    router.delete('/settings/users/invitations/:invitationId', [
      OrganizationSettingsController,
      'cancelInvitation',
    ])
    router.put('/settings/users/:userId/role', [OrganizationSettingsController, 'updateMemberRole'])
    router.delete('/settings/users/:userId', [OrganizationSettingsController, 'removeMember'])
    router.get('/settings/subscriptions', [OrganizationSettingsController, 'subscriptions'])
    router.get('/pricing', [OrganizationSettingsController, 'pricing'])
    router.post('/subscriptions/checkout', [SubscriptionsController, 'createCheckoutSession'])
    router.delete('/subscriptions/:id', [SubscriptionsController, 'cancelSubscription'])
    router.post('/subscriptions/:id/reactivate', [
      SubscriptionsController,
      'reactivateSubscription',
    ])
  })
  .prefix('/organizations')
  .use([middleware.auth(), middleware.requireOrganization(), middleware.organizationContext()])

// API routes for organization management
router
  .group(() => {
    router.get('/', [OrganizationsController, 'index'])
    router.post('/:id/switch', [OrganizationsController, 'switch'])
  })
  .prefix('/api/organizations')
  .use([middleware.auth()])
