import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import EmailVerificationService from '#auth/services/email_verification_service'
import { requestEmailChangeValidator } from '#auth/validators/email_verification_validator'
import { errors } from '@vinejs/vine'
import { AppException } from '#shared/exceptions/index'
import SessionService from '#sessions/services/session_service'

export default class EmailVerificationController {
  /**
   * Resend verification email to authenticated user
   * POST /auth/email/resend
   */
  async resend({ request, response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    try {
      const emailVerificationService = getService<EmailVerificationService>(
        TYPES.EmailVerificationService
      )
      const userRepo = getService(TYPES.UserRepository)
      const user = await userRepo.findById(userId)

      if (!user) {
        return response.status(401).json({ error: 'Utilisateur introuvable' })
      }

      await emailVerificationService.resendVerificationEmail(user.id)

      // Vérifier si c'est une requête Inertia
      const isInertiaRequest = request.header('x-inertia')

      if (isInertiaRequest) {
        // Pour Inertia, recharger la même page avec un message de succès
        return response.redirect().back()
      }

      return response.ok({
        success: true,
        message: `Email de vérification envoyé à l'adresse ${user.email}`,
      })
    } catch (error) {
      if (error instanceof AppException) {
        return response.status(error.status).json({
          success: false,
          error: {
            message: error.message,
            code: error.code,
          },
        })
      }

      throw error
    }
  }

  /**
   * Verify email with token
   * GET /auth/email/verify/:token
   */
  async verify({ params, response, inertia, session, request }: HttpContext) {
    const { token } = params

    const emailVerificationService = getService<EmailVerificationService>(
      TYPES.EmailVerificationService
    )

    const result = await emailVerificationService.verifyToken(token)

    const isApiRequest = this.isApiRequest(request)

    if (!result.success) {
      if (isApiRequest) {
        return response.status(400).json({
          success: false,
          error: result.error,
        })
      }
      // Pour Inertia, rediriger vers login avec erreur
      return inertia.render('auth/email-verification-result', {
        success: false,
        error: result.error,
      })
    }

    // Connecter automatiquement l'utilisateur après vérification
    session.put('user_id', result.userId)

    // Si l'utilisateur n'a pas de session active, en créer une nouvelle
    const existingSessionId = session.get('session_id')
    if (!existingSessionId) {
      const sessionService = getService<SessionService>(TYPES.SessionService)
      const userSession = await sessionService.createSession({
        userId: result.userId!,
        ipAddress: request.ip(),
        userAgent: request.header('user-agent') || 'Unknown',
        referrer: request.header('referer'),
      })
      session.put('session_id', userSession.id)
    }

    if (isApiRequest) {
      return response.json({
        success: true,
        message: 'Email vérifié avec succès',
      })
    }

    // Rediriger vers la page d'accueil
    return response.redirect('/')
  }

  private isApiRequest(request: any): boolean {
    return (
      request.header('accept')?.includes('application/json') ||
      request.url().startsWith('/api/') ||
      request.url().startsWith('/auth/')
    )
  }

  /**
   * Request email change
   * POST /auth/email/change
   */
  async requestChange({ request, response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    try {
      const { newEmail, password } = await request.validateUsing(requestEmailChangeValidator)

      const emailVerificationService = getService<EmailVerificationService>(
        TYPES.EmailVerificationService
      )
      const userRepo = getService(TYPES.UserRepository)
      const user = await userRepo.findById(userId)

      if (!user) {
        return response.status(401).json({ error: 'Utilisateur introuvable' })
      }

      await emailVerificationService.requestEmailChange(user.id, newEmail, password)

      return response.ok({
        success: true,
        message: `Email de confirmation envoyé à ${newEmail}`,
      })
    } catch (error) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.unprocessableEntity({
          errors: error.messages.map((msg) => ({
            field: msg.field,
            message: msg.message,
          })),
        })
      }

      if (error instanceof AppException) {
        return response.status(error.status).json({
          success: false,
          error: {
            message: error.message,
            code: error.code,
          },
        })
      }

      throw error
    }
  }

  /**
   * Verify email change with token
   * GET /auth/email/change/verify/:token
   */
  async verifyChange({ params, response }: HttpContext) {
    const { token } = params

    const emailVerificationService = getService<EmailVerificationService>(
      TYPES.EmailVerificationService
    )

    const result = await emailVerificationService.verifyEmailChange(token)

    if (!result.success) {
      return response.badRequest({
        success: false,
        error: result.error,
      })
    }

    return response.ok({
      success: true,
      message: 'Email modifié avec succès',
    })
  }
}
