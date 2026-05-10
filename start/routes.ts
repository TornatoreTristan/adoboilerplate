import router from '@adonisjs/core/services/router'
import transmit from '@adonisjs/transmit/services/main'

// Import all routes files
import './routes/health_routes.js'
import './routes/auth_routes.js'
import './routes/session_routes.js'
import './routes/google_auth_routes.js'
import './routes/email_verification_routes.js'
import './routes/notification_routes.js'
import './routes/upload_routes.js'
import './routes/upload_serve_routes.js'
import './routes/admin_routes.js'
import './routes/account_routes.js'
import './routes/organization_routes.js'
import './routes/webhook_routes.js'
import { middleware } from './kernel.js'

// Register Transmit SSE endpoint (auth is handled by transmit.authorize() in start/transmit.ts)
transmit.registerRoutes()

// Locale switching route (accessible to everyone)
const LocaleController = () => import('#shared/controllers/locale_controller')
router.post('/locale', [LocaleController, 'update'])

// Page d'accueil (protégée par authentification et nécessite une organisation)
router
  .on('/')
  .renderInertia('home', {})
  .use([middleware.auth(), middleware.requireOrganization(), middleware.organizationContext()])

// Page des notifications
const NotificationsController = () => import('#notifications/controllers/notifications_controller')
router
  .get('/notifications', [NotificationsController, 'index'])
  .as('notifications.page')
  .use([
    middleware.auth(),
    middleware.requireOrganization(),
    middleware.organizationContext(),
    middleware.updateSessionActivity(),
  ])

