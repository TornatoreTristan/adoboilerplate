import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#auth/controllers/auth_controller')
const PasswordResetController = () => import('#auth/controllers/password_reset_controller')

// Page de connexion (GET) - Seulement pour les non-connectés
router
  .get('/login', async ({ inertia }) => {
    return inertia.render('auth/login', {})
  })
  .use(middleware.guest())

// Page d'inscription (GET) - Seulement pour les non-connectés
router
  .get('/register', async ({ inertia }) => {
    return inertia.render('auth/register', {})
  })
  .use(middleware.guest())

// Routes publiques (pas de middleware auth)
router
  .group(() => {
    router.post('/login', [AuthController, 'login'])
    router.post('/register', [AuthController, 'register'])
    router.post('/logout', [AuthController, 'logout'])
  })
  .prefix('/auth')
  .use([middleware.throttle({ maxRequests: 10, windowMs: 60000 })])

// Routes protégées (sans middleware - vous pouvez l'ajouter plus tard)
router
  .group(() => {
    router.get('/me', [AuthController, 'me'])
  })
  .prefix('/auth')
  .use([middleware.auth(), middleware.updateSessionActivity()])

// Routes de réinitialisation de mot de passe
router
  .group(() => {
    router
      .post('/forgot', [PasswordResetController, 'forgot'])
      .use([
        middleware.throttle({ maxRequests: 10, windowMs: 300000, keyPrefix: 'password-forgot' }),
      ])
    router.get('/reset/:token', [PasswordResetController, 'validateToken'])
    router
      .post('/reset', [PasswordResetController, 'reset'])
      .use([
        middleware.throttle({ maxRequests: 10, windowMs: 300000, keyPrefix: 'password-reset' }),
      ])
  })
  .prefix('/password')
