import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const ApiTokensController = () => import('#api/controllers/api_tokens_controller')

const tokenWriteThrottle = middleware.throttle({
  maxRequests: 20,
  windowMs: 60_000,
  keyPrefix: 'api-tokens-write',
})

router
  .group(() => {
    router.get('/api-tokens', [ApiTokensController, 'page']).as('account.api_tokens.page')
    router
      .post('/api-tokens', [ApiTokensController, 'store'])
      .as('account.api_tokens.store')
      .use(tokenWriteThrottle)
    router
      .delete('/api-tokens/:id', [ApiTokensController, 'destroy'])
      .as('account.api_tokens.destroy')
      .use(tokenWriteThrottle)
  })
  .prefix('/account')
  .use([
    middleware.auth(),
    middleware.requireOrganization(),
    middleware.organizationContext(),
    middleware.updateSessionActivity(),
  ])
