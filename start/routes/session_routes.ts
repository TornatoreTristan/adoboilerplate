import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const SessionController = () => import('#sessions/controllers/session_controller')

router
  .group(() => {
    router.get('/sessions', [SessionController, 'index']).as('api.sessions.index')
    router.delete('/sessions/others', [SessionController, 'destroyOthers']).as('api.sessions.destroyOthers')
    router.delete('/sessions/:id', [SessionController, 'destroy']).as('api.sessions.destroy')
  })
  .prefix('/api')
  .use([middleware.auth(), middleware.updateSessionActivity()])
