import { type HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserRepository from '#users/repositories/user_repository'
import type SessionService from '#sessions/services/session_service'
import { updateProfileValidator } from '#users/validators/update_profile_validator'
import vine from '@vinejs/vine'

export default class UsersController {
  /**
   * Mettre à jour le profil de l'utilisateur connecté
   */
  async updateProfile({ request, response, session }: HttpContext) {
    const userId = session.get('user_id')
    const userRepository = getService<UserRepository>(TYPES.UserRepository)

    // Validation
    const data = await request.validateUsing(updateProfileValidator)

    // Mise à jour
    await userRepository.update(userId, {
      fullName: data.fullName,
    } as any)

    // Message de succès
    session.flash('success', 'Profil mis à jour avec succès')

    return response.redirect().back()
  }

  /**
   * Supprimer le compte de l'utilisateur connecté
   */
  async deleteAccount({ response, session }: HttpContext) {
    const userId = session.get('user_id')
    const sessionId = session.get('session_id')
    const userRepository = getService<UserRepository>(TYPES.UserRepository)
    const sessionService = getService<SessionService>(TYPES.SessionService)

    // Fermer toutes les sessions de l'utilisateur
    if (sessionId) {
      await sessionService.endSession(sessionId)
    }

    // Supprimer le compte (soft delete)
    await userRepository.delete(userId)

    // Déconnecter l'utilisateur
    session.forget('user_id')
    session.forget('session_id')

    // Message de succès
    session.flash('success', 'Votre compte a été supprimé avec succès')

    return response.redirect('/login')
  }

  /**
   * Mettre à jour les préférences de communication
   */
  async updateCommunicationPreferences({ request, response, session }: HttpContext) {
    const userId = session.get('user_id')
    const userRepository = getService<UserRepository>(TYPES.UserRepository)

    // Validation
    const communicationPreferencesValidator = vine.compile(
      vine.object({
        newsletter_enabled: vine.boolean(),
        tips_enabled: vine.boolean(),
        promotional_offers_enabled: vine.boolean(),
      })
    )

    const data = await request.validateUsing(communicationPreferencesValidator)

    // Mise à jour
    await userRepository.update(userId, {
      newsletterEnabled: data.newsletter_enabled,
      tipsEnabled: data.tips_enabled,
      promotionalOffersEnabled: data.promotional_offers_enabled,
    } as any)

    return response.json({
      success: true,
      message: 'Préférences de communication mises à jour',
    })
  }
}
