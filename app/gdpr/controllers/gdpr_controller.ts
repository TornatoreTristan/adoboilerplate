import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type GdprService from '#gdpr/services/gdpr_service'
import { E } from '#shared/exceptions/index'

export default class GdprController {
  /**
   * Page de gestion des données personnelles
   */
  async index({ inertia }: HttpContext) {
    return inertia.render('account/data-privacy', {})
  }

  /**
   * Export des données utilisateur (JSON)
   */
  async exportData({ user, response }: HttpContext) {
    E.assertUserExists(user)
    const userId = user.id
    const gdprService = getService<GdprService>(TYPES.GdprService)

    const data = await gdprService.exportUserData(userId)

    // Retourner JSON avec header pour téléchargement
    response.header('Content-Type', 'application/json')
    response.header(
      'Content-Disposition',
      `attachment; filename="my-data-${userId}-${Date.now()}.json"`
    )

    return response.json(data)
  }

  /**
   * Demande de suppression de compte
   */
  async requestDeletion({ user, request, response, session }: HttpContext) {
    E.assertUserExists(user)
    const { reason } = request.only(['reason'])

    const gdprService = getService<GdprService>(TYPES.GdprService)

    await gdprService.requestAccountDeletion(user.id, reason)

    session.flash('success', 'account.deletion_requested')

    return response.redirect().back()
  }

  /**
   * Annulation de la demande de suppression
   */
  async cancelDeletion({ user, response, session }: HttpContext) {
    E.assertUserExists(user)
    const gdprService = getService<GdprService>(TYPES.GdprService)

    await gdprService.cancelAccountDeletion(user.id)

    session.flash('success', 'account.deletion_cancelled')

    return response.redirect().toRoute('account.data-privacy')
  }
}
