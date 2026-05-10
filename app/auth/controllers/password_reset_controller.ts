import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type PasswordResetService from '#auth/services/password_reset_service'
import type EmailService from '#mailing/services/email_service'
import {
  forgotPasswordValidator,
  resetPasswordValidator,
} from '#auth/validators/password_reset_validator'
import { errors } from '@vinejs/vine'
import env from '#start/env'

export default class PasswordResetController {
  /**
   * Handle forgot password request
   * POST /password/forgot
   */
  async forgot({ request, response }: HttpContext) {
    const passwordResetService = getService<PasswordResetService>(TYPES.PasswordResetService)

    try {
      // Valider les données
      const { email } = await request.validateUsing(forgotPasswordValidator)

      // Créer un token de réinitialisation (retourne null si email inconnu)
      const tokenData = await passwordResetService.createPasswordResetToken(email)

      if (tokenData) {
        const emailService = getService<EmailService>(TYPES.EmailService)
        const appUrl = env.get('APP_URL')

        await emailService.sendPasswordResetEmail(email, {
          userName: email,
          resetUrl: `${appUrl}/password/reset/${tokenData.token}`,
          expiresIn: '1 heure',
        })
      }

      // Retourner toujours le même message pour des raisons de sécurité
      return response.ok({
        success: true,
        message: 'Si cette adresse email existe, vous recevrez un lien de réinitialisation',
      })
    } catch (error) {
      // Erreur de validation
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.unprocessableEntity({
          errors: error.messages.map((msg: { field: string; message: string }) => ({
            field: msg.field,
            message: msg.message,
          })),
        })
      }

      throw error
    }
  }

  /**
   * Validate a reset token
   * GET /password/reset/:token
   */
  async validateToken({ params, response }: HttpContext) {
    const passwordResetService = getService<PasswordResetService>(TYPES.PasswordResetService)
    const { token } = params

    const validation = await passwordResetService.validateToken(token)

    if (!validation.valid) {
      return response.badRequest({
        valid: false,
        error: validation.error,
      })
    }

    return response.ok({
      valid: true,
      email: validation.email,
    })
  }

  /**
   * Reset password with a valid token
   * POST /password/reset
   */
  async reset({ request, response }: HttpContext) {
    const passwordResetService = getService<PasswordResetService>(TYPES.PasswordResetService)

    try {
      // Valider les données
      const { token, password } = await request.validateUsing(resetPasswordValidator)

      // Vérifier le token d'abord
      const validation = await passwordResetService.validateToken(token)
      if (!validation.valid) {
        return response.badRequest({
          success: false,
          error: validation.error,
        })
      }

      // Réinitialiser le mot de passe
      const result = await passwordResetService.resetPassword(token, password)

      return response.ok(result)
    } catch (error) {
      // Erreur de validation
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.unprocessableEntity({
          errors: error.messages.map((msg: { field: string; message: string }) => ({
            field: msg.field,
            message: msg.message,
          })),
        })
      }

      // Erreur métier
      if (error instanceof Error) {
        return response.badRequest({
          success: false,
          error: error.message,
        })
      }

      throw error
    }
  }
}
