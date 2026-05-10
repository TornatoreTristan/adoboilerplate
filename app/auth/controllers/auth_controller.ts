import type { HttpContext } from '@adonisjs/core/http'
import type { LoginData, RegisterData } from '#shared/types/auth'
import { E } from '#shared/exceptions/index'
import { registerValidator } from '#auth/validators/register_validator'
import { loginValidator } from '#auth/validators/login_validator'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AuthService from '#auth/services/auth_service'
import type SessionService from '#sessions/services/session_service'
import type EmailVerificationService from '#auth/services/email_verification_service'
import type AccountLockoutService from '#auth/services/account_lockout_service'
import RateLimitService from '#shared/services/rate_limit_service'
import logger from '@adonisjs/core/services/logger'

const EMAIL_RATE_LIMIT_MAX_REQUESTS = 5
const EMAIL_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000

export default class AuthController {
  private rateLimitService = new RateLimitService()

  async login({ request, response, session }: HttpContext) {
    // Valider les données avec Vine
    const loginData = await request.validateUsing(loginValidator)

    // Rate limit par email — ne peut pas être bypassé en changeant d'IP
    const normalizedEmail = loginData.email.toLowerCase().trim()
    const emailRateLimit = await this.rateLimitService.checkLimit(
      `login:email:${normalizedEmail}`,
      {
        maxRequests: EMAIL_RATE_LIMIT_MAX_REQUESTS,
        windowMs: EMAIL_RATE_LIMIT_WINDOW_MS,
        keyPrefix: 'login-email',
      }
    )

    if (!emailRateLimit.allowed) {
      const retryAfter = Math.ceil((emailRateLimit.resetAt.getTime() - Date.now()) / 1000)
      response.header('Retry-After', retryAfter.toString())
      E.tooManyRequests(
        `Too many login attempts. Please try again in ${retryAfter} seconds.`,
        retryAfter
      )
    }

    // Account lockout — separate from rate limit; trips on consecutive
    // *failed* attempts and persists across rate-limit windows.
    const accountLockoutService = getService<AccountLockoutService>(TYPES.AccountLockoutService)
    const lockStatus = await accountLockoutService.getStatus(normalizedEmail)
    if (lockStatus.locked) {
      response.header('Retry-After', lockStatus.ttlSeconds.toString())
      E.tooManyRequests(
        `Account temporarily locked after too many failed login attempts. Try again in ${lockStatus.ttlSeconds} seconds.`,
        lockStatus.ttlSeconds
      )
    }

    // Récupérer les services
    const authService = getService<AuthService>(TYPES.AuthService)
    const sessionService = getService<SessionService>(TYPES.SessionService)

    // Utiliser AuthService pour vérifier les credentials
    const result = await authService.login(loginData as LoginData)

    // Si l'authentification échoue
    if (!result.success) {
      const failure = await accountLockoutService.recordFailure(normalizedEmail)
      if (failure.locked) {
        response.header('Retry-After', failure.ttlSeconds.toString())
        E.tooManyRequests(
          `Account locked after ${failure.failedAttempts} failed attempts. Try again in ${failure.ttlSeconds} seconds.`,
          failure.ttlSeconds
        )
      }
      if (this.isApiRequest(request)) {
        return response.status(401).json({
          success: false,
          error: { message: result.error },
        })
      }
      session.flashErrors({ email: result.error || '' })
      return response.redirect().back()
    }

    // Successful credentials — reset the lockout counter.
    await accountLockoutService.reset(normalizedEmail)

    // Régénérer l'ID de session pour prévenir la session fixation
    session.regenerate()

    // Créer la session utilisateur
    session.put('user_id', result.user!.id)

    // Extraire les données UTM et referrer
    const utmSource = request.input('utm_source')
    const utmMedium = request.input('utm_medium')
    const utmCampaign = request.input('utm_campaign')
    const referrer = request.header('referer')

    // Créer l'entrée de session dans la base
    const userSession = await sessionService.createSession({
      userId: result.user!.id,
      ipAddress: request.ip(),
      userAgent: request.header('user-agent') || 'Unknown',
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
    })

    // Stocker l'ID de session pour pouvoir la ferme au logout
    session.put('session_id', userSession.id)

    // Pour les requêtes API, retourner JSON
    if (this.isApiRequest(request)) {
      return response.json({ success: true })
    }

    // Sinon rediriger vers la page d'accueil
    return response.redirect('/')
  }

  private isApiRequest(request: any): boolean {
    if (request.header('x-inertia')) {
      return false
    }
    return (
      request.header('accept')?.includes('application/json') ||
      request.header('content-type')?.includes('application/json') ||
      request.url().startsWith('/api/') ||
      request.header('x-requested-with') === 'XMLHttpRequest'
    )
  }

  async logout({ request, response, session }: HttpContext) {
    const sessionId = session.get('session_id')
    const sessionService = getService<SessionService>(TYPES.SessionService)

    if (sessionId) {
      await sessionService.endSession(sessionId)
    }

    session.forget('user_id')
    session.forget('session_id')

    // Pour les requêtes API, retourner JSON
    if (this.isApiRequest(request)) {
      return response.json({
        success: true,
        data: { message: 'Déconnecté avec succès' },
      })
    }

    // Sinon rediriger vers la page de login
    return response.redirect('/login')
  }

  async me({ response, user }: HttpContext) {
    // L'utilisateur est maintenant automatiquement chargé par le middleware auth
    // Si on arrive ici, c'est qu'il est authentifié
    E.assertUserExists(user)

    return response.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
      },
    })
  }

  async register({ request, response, session }: HttpContext) {
    // Valider les données avec Vine
    const registerData = await request.validateUsing(registerValidator)

    // Récupérer les services
    const authService = getService<AuthService>(TYPES.AuthService)
    const sessionService = getService<SessionService>(TYPES.SessionService)

    // Utiliser AuthService pour créer l'utilisateur
    const result = await authService.register(registerData as RegisterData)

    // Si l'inscription échoue, rediriger avec erreur
    if (!result.success) {
      session.flashErrors({ email: result.error || '' })
      return response.redirect().back()
    }

    // Régénérer l'ID de session pour prévenir la session fixation
    session.regenerate()

    // Créer la session utilisateur automatiquement après inscription
    session.put('user_id', result.user!.id)

    // Extraire les données UTM et referrer
    const utmSource = request.input('utm_source')
    const utmMedium = request.input('utm_medium')
    const utmCampaign = request.input('utm_campaign')
    const referrer = request.header('referer')

    // Créer l'entrée de session dans la base
    const userSession = await sessionService.createSession({
      userId: result.user!.id,
      ipAddress: request.ip(),
      userAgent: request.header('user-agent') || 'Unknown',
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
    })

    // Stocker l'ID de session
    session.put('session_id', userSession.id)

    // Envoyer l'email de vérification
    try {
      const emailVerificationService = getService<EmailVerificationService>(
        TYPES.EmailVerificationService
      )
      await emailVerificationService.sendVerificationEmail(result.user!.id)
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de l'envoi de l'email de vérification")
    }

    // Rediriger vers la page de confirmation
    return response.redirect('/auth/verify-email-notice')
  }
}
