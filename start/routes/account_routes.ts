import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const SessionController = () => import('#sessions/controllers/session_controller')
const UsersController = () => import('#users/controllers/users_controller')
const GdprController = () => import('#gdpr/controllers/gdpr_controller')

// Routes du compte utilisateur
router
  .group(() => {
    // Mes informations
    router.get('/profile', async ({ inertia }) => {
      return inertia.render('account/profile', {})
    })
    router.put('/profile', [UsersController, 'updateProfile'])
    router.delete('/delete', [UsersController, 'deleteAccount'])

    // Mes sessions
    router.get('/sessions', [SessionController, 'page']).as('account.sessions.page')
    router.delete('/sessions/:id', [SessionController, 'destroy']).as('account.sessions.destroy')
    router.delete('/sessions/others', [SessionController, 'destroyOthers']).as('account.sessions.destroyOthers')

    // Mes préférences
    router.get('/preferences', async ({ inertia, session }) => {
      const { getService } = await import('#shared/container/container')
      const { TYPES } = await import('#shared/container/types')
      const UserRepository = (await import('#users/repositories/user_repository')).default

      const userId = session.get('user_id')
      const userRepo = getService<typeof UserRepository.prototype>(TYPES.UserRepository)
      const user = await userRepo.findById(userId)

      return inertia.render('account/preferences', {
        user: {
          newsletter_enabled: user?.newsletterEnabled ?? true,
          tips_enabled: user?.tipsEnabled ?? false,
          promotional_offers_enabled: user?.promotionalOffersEnabled ?? false,
        }
      })
    })
    router.put('/communication-preferences', [UsersController, 'updateCommunicationPreferences'])

    // GDPR - Données personnelles
    router.get('/data-privacy', [GdprController, 'index']).as('account.data-privacy')
    router.get('/data-export', [GdprController, 'exportData'])
    router.post('/delete-request', [GdprController, 'requestDeletion'])
    router.post('/cancel-deletion', [GdprController, 'cancelDeletion'])
  })
  .prefix('/account')
  .use([
    middleware.auth(),
    middleware.requireOrganization(),
    middleware.organizationContext(),
    middleware.updateSessionActivity(),
  ])
