import transmit from '@adonisjs/transmit/services/main'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Transmit Authorization Rules
 *
 * Définit qui peut s'abonner à quels canaux
 */

/**
 * Canal: user/:userId/notifications
 * Autorise uniquement l'utilisateur lui-même à recevoir ses notifications
 */
transmit.authorize<{ userId: string }>(
  'user/:userId/notifications',
  (ctx: HttpContext, { userId }) => {
    // Récupérer l'utilisateur depuis la session (comme le fait AuthMiddleware)
    const authenticatedUserId = ctx.session.get('user_id')

    // L'utilisateur doit être authentifié ET c'est son propre canal
    return authenticatedUserId === userId
  }
)

/**
 * Canal: organization/:organizationId/notifications
 * Autorise les membres de l'organisation
 */
transmit.authorize<{ organizationId: string }>(
  'organization/:organizationId/notifications',
  async (ctx: HttpContext, { organizationId }) => {
    if (!ctx.auth.user) return false

    // Vérifier que l'utilisateur est membre de l'organisation
    const isMember = await ctx.auth.user
      .related('organizations')
      .query()
      .where('organizations.id', organizationId)
      .first()

    return !!isMember
  }
)
