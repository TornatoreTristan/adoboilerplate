import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const ApiTokensController = () => import('#api/controllers/api_tokens_controller')

router
  .group(() => {
    router.get('/api-tokens', [ApiTokensController, 'page']).as('account.api_tokens.page')
    router.post('/api-tokens', [ApiTokensController, 'store']).as('account.api_tokens.store')
    router
      .delete('/api-tokens/:id', [ApiTokensController, 'destroy'])
      .as('account.api_tokens.destroy')
  })
  .prefix('/account')
  .use([
    middleware.auth(),
    middleware.requireOrganization(),
    middleware.organizationContext(),
    middleware.updateSessionActivity(),
  ])
