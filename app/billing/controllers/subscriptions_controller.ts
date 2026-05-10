import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type SubscriptionService from '#billing/services/subscription_service'
import { E } from '#shared/exceptions/index'
import vine from '@vinejs/vine'

const createCheckoutSessionValidator = vine.compile(
  vine.object({
    planId: vine.string().trim(),
    billingInterval: vine.enum(['month', 'year']),
  })
)

export default class SubscriptionsController {
  /**
   * Créer une session Stripe Checkout pour souscrire à un plan
   */
  async createCheckoutSession({ request, user, organization, inertia }: HttpContext) {
    E.assertUserExists(user)
    E.assertOrganizationExists(organization)

    const data = await request.validateUsing(createCheckoutSessionValidator)

    const subscriptionService = getService<SubscriptionService>(TYPES.SubscriptionService)

    // Construire les URLs de retour
    const protocol = request.protocol()
    const host = request.host()
    const baseUrl = `${protocol}://${host}`
    const successUrl = `${baseUrl}/organizations/subscriptions/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/organizations/pricing`

    const checkoutUrl = await subscriptionService.createCheckoutSession(
      organization.id,
      data.planId,
      data.billingInterval,
      successUrl,
      cancelUrl
    )

    // Utiliser Inertia location pour redirection externe
    return inertia.location(checkoutUrl)
  }

  /**
   * Page de succès après paiement Stripe
   */
  async success({ inertia, request }: HttpContext) {
    const sessionId = request.qs().session_id

    return inertia.render('organizations/subscription-success', {
      sessionId,
    })
  }

  /**
   * Page d'annulation (retour depuis Stripe)
   */
  async cancel({ response }: HttpContext) {
    return response.redirect('/organizations/pricing')
  }

  /**
   * Annuler un abonnement à la fin de la période
   */
  async cancelSubscription({ response, session, params, user, organization }: HttpContext) {
    E.assertUserExists(user)
    E.assertOrganizationExists(organization)

    const subscriptionId = params.id
    const subscriptionService = getService<SubscriptionService>(TYPES.SubscriptionService)

    await subscriptionService.cancelSubscription(subscriptionId, organization.id)

    session.flash(
      'success',
      "Votre abonnement sera annulé à la fin de la période de facturation. Vous conservez l'accès jusqu'à cette date."
    )

    return response.redirect().back()
  }

  /**
   * Réactiver un abonnement annulé
   */
  async reactivateSubscription({ response, session, params, user, organization }: HttpContext) {
    E.assertUserExists(user)
    E.assertOrganizationExists(organization)

    const subscriptionId = params.id
    const subscriptionService = getService<SubscriptionService>(TYPES.SubscriptionService)

    await subscriptionService.reactivateSubscription(subscriptionId, organization.id)

    session.flash('success', 'Votre abonnement a été réactivé avec succès !')

    return response.redirect().back()
  }

  /**
   * Mettre en pause un abonnement
   */
  async pauseSubscription({ response, session, params, user, organization }: HttpContext) {
    E.assertUserExists(user)
    E.assertOrganizationExists(organization)

    const subscriptionId = params.id
    const subscriptionService = getService<SubscriptionService>(TYPES.SubscriptionService)

    await subscriptionService.pauseSubscription(subscriptionId, organization.id)

    session.flash(
      'success',
      "L'abonnement a été mis en pause. Les factures ne seront plus générées."
    )

    return response.redirect().back()
  }

  /**
   * Reprendre un abonnement en pause
   */
  async resumeSubscription({ response, session, params, user, organization }: HttpContext) {
    E.assertUserExists(user)
    E.assertOrganizationExists(organization)

    const subscriptionId = params.id
    const subscriptionService = getService<SubscriptionService>(TYPES.SubscriptionService)

    await subscriptionService.resumeSubscription(subscriptionId, organization.id)

    session.flash('success', "L'abonnement a été repris. Les factures seront à nouveau générées.")

    return response.redirect().back()
  }
}
