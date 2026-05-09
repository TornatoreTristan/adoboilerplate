import { inject, injectable } from 'inversify'
import { TYPES } from '#shared/container/types'
import type SubscriptionRepository from '#billing/repositories/subscription_repository'
import type PlanRepository from '#billing/repositories/plan_repository'
import type Subscription from '#billing/models/subscription'
import Stripe from 'stripe'
import env from '#start/env'
import { E } from '#shared/exceptions/exception_helpers'
import { DateTime } from 'luxon'

@injectable()
export default class SubscriptionService {
  constructor(
    @inject(TYPES.SubscriptionRepository) private subscriptionRepository: SubscriptionRepository,
    @inject(TYPES.PlanRepository) private planRepository: PlanRepository
  ) {}

  /**
   * Migrer un abonnement vers le nouveau prix du plan
   * Utile quand vous avez changé le prix d'un plan et voulez mettre à jour les abonnements existants
   */
  async migrateToNewPrice(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findByIdOrFail(subscriptionId)

    // Charger le plan pour obtenir le nouveau price_id
    const plan = await this.planRepository.findByIdOrFail(subscription.planId)

    if (!subscription.stripeSubscriptionId) {
      throw new Error('L\'abonnement n\'est pas synchronisé avec Stripe')
    }

    // Détecter le bon price ID selon le billing interval de l'abonnement
    const newStripePriceId =
      subscription.billingInterval === 'month'
        ? plan.stripePriceIdMonthly
        : plan.stripePriceIdYearly

    if (!newStripePriceId) {
      throw new Error(
        `Le plan n'est pas synchronisé avec Stripe pour l'interval ${subscription.billingInterval}`
      )
    }

    // Si l'abonnement utilise déjà le bon prix, rien à faire
    if (subscription.stripePriceId === newStripePriceId) {
      return subscription
    }

    // Mettre à jour l'abonnement dans Stripe
    const stripe = await this.getStripeClient()
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    )

    // Récupérer le subscription item (il y en a généralement qu'un seul pour les plans simples)
    const subscriptionItemId = stripeSubscription.items.data[0]?.id

    if (!subscriptionItemId) {
      throw new Error('Aucun item trouvé dans l\'abonnement Stripe')
    }

    // Mettre à jour le prix de l'abonnement
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: newStripePriceId,
        },
      ],
      proration_behavior: 'none', // Pas de prorata
      billing_cycle_anchor: 'unchanged', // Le nouveau prix s'appliquera à la prochaine période
    })

    // Récupérer le nouveau prix
    const newPrice = subscription.billingInterval === 'month'
      ? plan.priceMonthly
      : plan.priceYearly

    // Mettre à jour la base de données
    return this.subscriptionRepository.update(subscriptionId, {
      stripePriceId: newStripePriceId,
      price: newPrice,
      currency: plan.currency,
    })
  }

  /**
   * Récupérer les factures d'une organisation depuis Stripe
   */
  async getOrganizationInvoices(
    organizationId: string,
    limit: number = 10
  ): Promise<Stripe.Invoice[]> {
    const subscription = await this.subscriptionRepository.findActiveByOrganizationId(organizationId)

    if (!subscription || !subscription.stripeCustomerId) {
      return []
    }

    const stripe = await this.getStripeClient()

    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit,
    })

    return invoices.data
  }

  /**
   * Créer une session Stripe Checkout pour souscrire à un plan
   */
  async createCheckoutSession(
    organizationId: string,
    planId: string,
    billingInterval: 'month' | 'year',
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    const plan = await this.planRepository.findByIdOrFail(planId)
    const stripe = await this.getStripeClient()

    // Déterminer le bon price ID selon l'interval
    const stripePriceId =
      billingInterval === 'month' ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly

    if (!stripePriceId) {
      throw new Error(
        `Le plan n'a pas de prix configuré pour l'interval ${billingInterval}`
      )
    }

    // Vérifier si l'organisation a déjà un customer Stripe
    let stripeCustomerId: string | undefined
    const existingSubscription = await this.subscriptionRepository.findActiveByOrganizationId(organizationId)

    if (existingSubscription?.stripeCustomerId) {
      stripeCustomerId = existingSubscription.stripeCustomerId
    }

    // Créer la session Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId,
        planId,
        billingInterval,
      },
      subscription_data: {
        metadata: {
          organizationId,
          planId,
        },
        trial_period_days: plan.trialDays || undefined,
      },
    })

    if (!session.url) {
      throw new Error('Impossible de créer la session Stripe Checkout')
    }

    return session.url
  }

  /**
   * Annuler un abonnement à la fin de la période
   * L'utilisateur garde l'accès jusqu'à la fin de la période payée
   */
  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId)

    E.assertExists(subscription, 'Subscription', subscriptionId)

    if (!subscription.stripeSubscriptionId) {
      E.subscriptionNotSynced()
    }

    const stripe = await this.getStripeClient()

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })

    return this.subscriptionRepository.update(subscriptionId, {
      canceledAt: DateTime.now(),
    })
  }

  /**
   * Réactiver un abonnement annulé (avant la fin de la période)
   */
  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId)

    E.assertExists(subscription, 'Subscription', subscriptionId)

    if (!subscription.stripeSubscriptionId) {
      E.subscriptionNotSynced()
    }

    const stripe = await this.getStripeClient()

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    })

    return this.subscriptionRepository.update(subscriptionId, {
      canceledAt: null,
    })
  }

  /**
   * Obtenir le client Stripe
   */
  private async getStripeClient(): Promise<Stripe> {
    const secretKey = env.get('STRIPE_SECRET_KEY')

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured in .env')
    }

    return new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
    })
  }

  /**
   * Mettre en pause un abonnement
   * L'abonnement reste actif mais les factures ne sont plus générées
   */
  async pauseSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findByIdOrFail(subscriptionId)

    if (!subscription.stripeSubscriptionId) {
      E.subscriptionNotSynced(subscriptionId)
    }

    if (subscription.status === 'canceled') {
      throw new Error('Impossible de mettre en pause un abonnement annulé')
    }

    const stripe = await this.getStripeClient()

    // Mettre en pause dans Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: {
        behavior: 'mark_uncollectible', // Les factures sont marquées comme non collectables
      },
    })

    // Mettre à jour la base de données
    return this.subscriptionRepository.update(subscriptionId, {
      status: 'paused',
    })
  }

  /**
   * Reprendre un abonnement en pause
   */
  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findByIdOrFail(subscriptionId)

    if (!subscription.stripeSubscriptionId) {
      E.subscriptionNotSynced(subscriptionId)
    }

    if (subscription.status !== 'paused') {
      throw new Error('Seuls les abonnements en pause peuvent être repris')
    }

    const stripe = await this.getStripeClient()

    // Reprendre dans Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: null, // Supprime la pause
    })

    // Mettre à jour la base de données
    return this.subscriptionRepository.update(subscriptionId, {
      status: 'active',
    })
  }

  /**
   * Annuler un abonnement à la fin de la période en cours
   * L'abonnement reste actif jusqu'à currentPeriodEnd puis passe à canceled
   */
  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findByIdOrFail(subscriptionId)

    if (!subscription.stripeSubscriptionId) {
      E.subscriptionNotSynced(subscriptionId)
    }

    if (subscription.status === 'canceled') {
      throw new Error('Cet abonnement est déjà annulé')
    }

    const stripe = await this.getStripeClient()

    // Annuler dans Stripe à la fin de période
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })

    // Mettre à jour la base de données
    return this.subscriptionRepository.update(subscriptionId, {
      canceledAt: DateTime.now(),
    })
  }

  /**
   * Réactiver un abonnement annulé (avant la fin de période)
   * Annule la demande d'annulation
   */
  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findByIdOrFail(subscriptionId)

    if (!subscription.stripeSubscriptionId) {
      E.subscriptionNotSynced(subscriptionId)
    }

    if (!subscription.canceledAt) {
      throw new Error('Cet abonnement n\'est pas en cours d\'annulation')
    }

    const stripe = await this.getStripeClient()

    // Annuler la demande d'annulation dans Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    })

    // Mettre à jour la base de données
    return this.subscriptionRepository.update(subscriptionId, {
      canceledAt: null,
    })
  }
}
