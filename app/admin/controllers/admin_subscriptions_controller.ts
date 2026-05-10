import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type SubscriptionService from '#billing/services/subscription_service'

export default class AdminSubscriptionsController {
  /**
   * Mettre en pause un abonnement (Admin uniquement)
   */
  async pause({ response, session, params }: HttpContext) {
    const subscriptionId = params.id
    const subscriptionService = getService<SubscriptionService>(TYPES.SubscriptionService)

    try {
      await subscriptionService.pauseSubscription(subscriptionId)
      session.flash('success', "L'abonnement a été mis en pause avec succès.")
    } catch (error) {
      session.flash('error', error.message)
    }

    return response.redirect().back()
  }

  /**
   * Reprendre un abonnement en pause (Admin uniquement)
   */
  async resume({ response, session, params }: HttpContext) {
    const subscriptionId = params.id
    const subscriptionService = getService<SubscriptionService>(TYPES.SubscriptionService)

    try {
      await subscriptionService.resumeSubscription(subscriptionId)
      session.flash('success', "L'abonnement a été repris avec succès.")
    } catch (error) {
      session.flash('error', error.message)
    }

    return response.redirect().back()
  }

  /**
   * Annuler un abonnement à la fin de période (Admin uniquement)
   */
  async cancel({ response, session, params }: HttpContext) {
    const subscriptionId = params.id
    const subscriptionService = getService<SubscriptionService>(TYPES.SubscriptionService)

    try {
      await subscriptionService.cancelSubscription(subscriptionId)
      session.flash('success', "L'abonnement sera annulé à la fin de la période en cours.")
    } catch (error) {
      session.flash('error', error.message)
    }

    return response.redirect().back()
  }

  /**
   * Réactiver un abonnement annulé (Admin uniquement)
   */
  async reactivate({ response, session, params }: HttpContext) {
    const subscriptionId = params.id
    const subscriptionService = getService<SubscriptionService>(TYPES.SubscriptionService)

    try {
      await subscriptionService.reactivateSubscription(subscriptionId)
      session.flash('success', "L'abonnement a été réactivé avec succès.")
    } catch (error) {
      session.flash('error', error.message)
    }

    return response.redirect().back()
  }
}
