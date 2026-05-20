import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type SubscriptionRepository from '#billing/repositories/subscription_repository'
import type PlanRepository from '#billing/repositories/plan_repository'
import type StripeWebhookEventRepository from '#billing/repositories/stripe_webhook_event_repository'
import type StripeClientService from '#billing/services/stripe_client_service'
import type Stripe from 'stripe'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

/**
 * In Stripe SDK v19 the per-period timestamps moved from the Subscription
 * object onto each SubscriptionItem, so reading them from a Subscription
 * directly always returns undefined. We pull them from the first item.
 */
function getSubscriptionPeriod(sub: Stripe.Subscription): {
  start: number | null
  end: number | null
} {
  const item = sub.items?.data?.[0]
  return {
    start: item?.current_period_start ?? null,
    end: item?.current_period_end ?? null,
  }
}

/**
 * In v19 Invoice.subscription is gone; the link lives on
 * invoice.parent.subscription_details.subscription (string id or expanded
 * Subscription).
 */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription
  if (!sub) return null
  return typeof sub === 'string' ? sub : sub.id
}

export default class StripeWebhookController {
  async handle({ request, response }: HttpContext) {
    const signature = request.header('stripe-signature')
    const webhookSecret = env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature) {
      logger.warn('Webhook Stripe reçu sans signature')
      return response.badRequest({ error: 'Missing signature' })
    }

    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET non configuré')
      return response.internalServerError({ error: 'Webhook secret not configured' })
    }

    const stripeClient = getService<StripeClientService>(TYPES.StripeClientService).client

    let event: Stripe.Event

    try {
      const rawBody = request.raw()
      if (!rawBody) {
        return response.badRequest({ error: 'Empty request body' })
      }
      event = stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch (err) {
      logger.warn({ err }, 'Signature webhook Stripe invalide')
      return response.badRequest({ error: 'Invalid signature' })
    }

    logger.info({ type: event.type }, 'Webhook Stripe reçu')

    // Stripe delivers at-least-once; check the event_id before processing to
    // prevent double-billing or duplicate side-effects on network retries.
    const webhookEventRepo = getService<StripeWebhookEventRepository>(
      TYPES.StripeWebhookEventRepository
    )

    const alreadyProcessed = await webhookEventRepo.hasBeenProcessed(event.id)
    if (alreadyProcessed) {
      logger.info({ eventId: event.id, type: event.type }, 'Webhook dupliqué ignoré')
      return response.ok({ received: true })
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session,
            stripeClient
          )
          break

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
          break

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
          break

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
          break

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
          break

        default:
          logger.info({ type: event.type }, 'Événement webhook non géré')
      }

      await webhookEventRepo.markProcessed(event.id, event.type)

      return response.ok({ received: true })
    } catch (error) {
      logger.error({ error, eventType: event.type }, 'Erreur lors du traitement du webhook')
      return response.internalServerError({ error: 'Webhook processing failed' })
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
    stripeClient: Stripe
  ) {
    logger.info({ sessionId: session.id }, 'Traitement checkout.session.completed')

    const subscriptionRepo = getService<SubscriptionRepository>(TYPES.SubscriptionRepository)
    const planRepo = getService<PlanRepository>(TYPES.PlanRepository)

    const organizationId = session.metadata?.organizationId
    const planId = session.metadata?.planId

    logger.info({ organizationId, planId, metadata: session.metadata }, 'Metadata extraites')

    if (!organizationId || !planId) {
      logger.warn(
        { sessionId: session.id, metadata: session.metadata },
        'Metadata manquantes dans la session checkout'
      )
      return
    }

    const stripeSubscriptionId = session.subscription as string
    if (!stripeSubscriptionId) {
      logger.warn({ sessionId: session.id }, 'Pas de subscription dans la session')
      return
    }

    logger.info({ stripeSubscriptionId }, 'Récupération de la subscription Stripe')

    const stripeSubscription = await stripeClient.subscriptions.retrieve(stripeSubscriptionId)
    const plan = await planRepo.findByIdOrFail(planId)
    const billingInterval = stripeSubscription.items.data[0].plan.interval as 'month' | 'year'

    const existingSubscription =
      await subscriptionRepo.findByStripeSubscriptionId(stripeSubscriptionId)

    if (existingSubscription) {
      logger.info(
        { subscriptionId: existingSubscription.id },
        'Abonnement déjà existant, mise à jour'
      )
      const period = getSubscriptionPeriod(stripeSubscription)
      await subscriptionRepo.update(existingSubscription.id, {
        status: stripeSubscription.status,
        currentPeriodStart: period.start ? DateTime.fromSeconds(period.start) : null,
        currentPeriodEnd: period.end ? DateTime.fromSeconds(period.end) : null,
        trialEndsAt: stripeSubscription.trial_end
          ? DateTime.fromSeconds(stripeSubscription.trial_end)
          : null,
      })
    } else {
      logger.info({ organizationId, planId, billingInterval }, 'Création du nouvel abonnement')

      const price = billingInterval === 'month' ? plan.priceMonthly : plan.priceYearly

      try {
        const period = getSubscriptionPeriod(stripeSubscription)
        const newSubscription = await subscriptionRepo.create({
          organizationId,
          planId,
          stripeSubscriptionId,
          stripeCustomerId: stripeSubscription.customer as string,
          stripeSubscriptionItemId: stripeSubscription.items.data[0].id,
          stripePriceId: stripeSubscription.items.data[0].price.id,
          quantity: stripeSubscription.items.data[0].quantity || 1,
          userCount: 1,
          billingInterval,
          price,
          currency: plan.currency,
          status: stripeSubscription.status,
          currentPeriodStart: period.start ? DateTime.fromSeconds(period.start) : null,
          currentPeriodEnd: period.end ? DateTime.fromSeconds(period.end) : null,
          trialEndsAt: stripeSubscription.trial_end
            ? DateTime.fromSeconds(stripeSubscription.trial_end)
            : null,
          canceledAt: null,
        })

        logger.info(
          { subscriptionId: newSubscription.id, organizationId, planId },
          'Nouvel abonnement créé avec succès'
        )
      } catch (error) {
        logger.error(
          { error, organizationId, planId },
          "Erreur lors de la création de l'abonnement"
        )
        throw error
      }
    }
  }

  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
    const subscriptionRepo = getService<SubscriptionRepository>(TYPES.SubscriptionRepository)

    const subscription = await subscriptionRepo.findByStripeSubscriptionId(stripeSubscription.id)

    if (!subscription) {
      logger.warn(
        { stripeSubscriptionId: stripeSubscription.id },
        'Abonnement non trouvé pour mise à jour'
      )
      return
    }

    const period = getSubscriptionPeriod(stripeSubscription)
    await subscriptionRepo.update(subscription.id, {
      status: stripeSubscription.status,
      currentPeriodStart: period.start ? DateTime.fromSeconds(period.start) : null,
      currentPeriodEnd: period.end ? DateTime.fromSeconds(period.end) : null,
      trialEndsAt: stripeSubscription.trial_end
        ? DateTime.fromSeconds(stripeSubscription.trial_end)
        : null,
      canceledAt: stripeSubscription.canceled_at
        ? DateTime.fromSeconds(stripeSubscription.canceled_at)
        : null,
    })

    logger.info({ subscriptionId: subscription.id }, 'Abonnement mis à jour')
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    const subscriptionRepo = getService<SubscriptionRepository>(TYPES.SubscriptionRepository)

    const subscription = await subscriptionRepo.findByStripeSubscriptionId(stripeSubscription.id)

    if (!subscription) {
      logger.warn(
        { stripeSubscriptionId: stripeSubscription.id },
        'Abonnement non trouvé pour suppression'
      )
      return
    }

    await subscriptionRepo.update(subscription.id, {
      status: 'canceled',
      canceledAt: DateTime.now(),
    })

    logger.info({ subscriptionId: subscription.id }, 'Abonnement annulé')
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    logger.info({ invoiceId: invoice.id }, 'Paiement de facture réussi')
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionRepo = getService<SubscriptionRepository>(TYPES.SubscriptionRepository)

    const stripeSubscriptionId = getInvoiceSubscriptionId(invoice)
    if (!stripeSubscriptionId) return

    const subscription = await subscriptionRepo.findByStripeSubscriptionId(stripeSubscriptionId)

    if (!subscription) {
      logger.warn({ invoiceId: invoice.id }, 'Abonnement non trouvé pour échec de paiement')
      return
    }

    await subscriptionRepo.update(subscription.id, {
      status: 'past_due',
    })

    logger.warn({ subscriptionId: subscription.id, invoiceId: invoice.id }, 'Échec de paiement')
  }
}
