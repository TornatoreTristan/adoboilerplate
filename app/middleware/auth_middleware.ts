import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserRepository from '#users/repositories/user_repository'
import { E } from '#shared/exceptions/index'

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const userRepository = getService<UserRepository>(TYPES.UserRepository)
    const userId = ctx.session.get('user_id')

    // Si pas d'ID utilisateur en session
    if (!userId) {
      return this.handleUnauthenticated(ctx)
    }

    // includeDeleted: pendant la grace period RGPD (deleted_at dans le
    // futur), l'utilisateur doit garder accès à son compte pour pouvoir
    // annuler la suppression. La cron processScheduledDeletions hard-delete
    // les lignes dont deleted_at est passé, donc une ligne encore présente
    // avec deleted_at dans le passé est une anomalie qu'on traite comme
    // "compte fermé" en bloquant l'accès.
    const user = await userRepository.findById(userId, {
      includeDeleted: true,
      cache: {
        ttl: 300,
        tags: [`user_${userId}`, 'users'],
      },
    })

    // Si l'utilisateur n'existe plus (ou suppression définitive arrivée à terme)
    if (!user || (user.deleted_at && user.deleted_at.toMillis() <= Date.now())) {
      // Nettoyer la session invalide
      ctx.session.forget('user_id')
      ctx.session.forget('session_id')
      return this.handleUnauthenticated(ctx)
    }

    // Stocker l'utilisateur dans le contexte
    ctx.user = user

    return next()
  }

  /**
   * Gère les requêtes non authentifiées
   * - Requêtes web/Inertia : redirection vers /login
   * - Requêtes API : exception 401
   */
  private handleUnauthenticated(ctx: HttpContext) {
    // Détecter si c'est une requête Inertia (header x-inertia)
    if (ctx.request.header('x-inertia')) {
      return ctx.response.redirect('/login')
    }

    // Détecter si c'est une requête API (attend du JSON)
    const isApiRequest =
      ctx.request.header('accept')?.includes('application/json') ||
      ctx.request.url().startsWith('/api/')

    if (isApiRequest) {
      // Pour les requêtes API, lever une exception
      E.unauthorized('Authentification requise')
    }

    // Pour toutes les autres requêtes web, rediriger vers login
    return ctx.response.redirect('/login')
  }
}
