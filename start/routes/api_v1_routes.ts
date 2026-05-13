import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { API_SCOPES } from '#api/constants/api_scopes'

const V1UsersController = () => import('#api/controllers/v1/users_controller')

router
  .group(() => {
    router
      .get('/users/me', [V1UsersController, 'me'])
      .use(middleware.apiScope([API_SCOPES.USERS_READ]))
  })
  .prefix('/api/v1')
  .use([
    middleware.apiAuth(),
    middleware.throttle({ maxRequests: 100, windowMs: 60_000, strategy: 'token' }),
  ])
