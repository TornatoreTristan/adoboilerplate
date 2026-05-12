import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Stripe from 'stripe'
import testUtils from '@adonisjs/core/services/test_utils'
import env from '#start/env'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type SubscriptionRepository from '#billing/repositories/subscription_repository'
import type PlanRepository from '#billing/repositories/plan_repository'
import type OrganizationRepository from '#organizations/repositories/organization_repository'

/**
 * Sign a Stripe webhook payload with the test secret so the controller's
 * stripe.webhooks.constructEvent call succeeds locally (no network).
 * The request is sent via apiClient.json(event), which serializes with
 * JSON.stringify — same as what we sign here.
 */
function signWebhook(eventBody: object, secret: string): { signature: string } {
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload: JSON.stringify(eventBody),
    secret,
  })
  return { signature }
}

function buildEvent(type: string, object: Record<string, unknown>) {
  return {
    id: `evt_test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    object: 'event',
    type,
    data: { object },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
  }
}

test.group('StripeWebhookController - signature validation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('returns 400 when the stripe-signature header is missing', async ({ client }) => {
    const response = await client.post('/webhooks/stripe').json({ type: 'noop' })

    response.assertStatus(400)
    response.assertBodyContains({ error: 'Missing signature' })
  })

  test('returns 400 when the signature does not match the payload', async ({ client }) => {
    const event = buildEvent('customer.subscription.updated', { id: 'sub_xxx' })

    const response = await client
      .post('/webhooks/stripe')
      .header('stripe-signature', 't=1,v1=invalidsignature')
      .json(event)

    response.assertStatus(400)
    response.assertBodyContains({ error: 'Invalid signature' })
  })
})

test.group('StripeWebhookController - customer.subscription.updated', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('updates an existing subscription row in DB', async ({ client, assert }) => {
    const secret = env.get('STRIPE_WEBHOOK_SECRET')
    const subscriptionRepo = getService<SubscriptionRepository>(TYPES.SubscriptionRepository)
    const planRepo = getService<PlanRepository>(TYPES.PlanRepository)
    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    const plan = await planRepo.create({
      nameI18n: { fr: 'Pro', en: 'Pro' },
      slug: `plan-${Date.now()}`,
      pricingModel: 'flat',
      priceMonthly: 29,
      priceYearly: 290,
      currency: 'EUR',
      isActive: true,
      isVisible: true,
      sortOrder: 1,
    })

    const org = await orgRepo.create({
      name: 'Test Org',
      slug: `org-${Date.now()}`,
      isActive: true,
    })

    const subscription = await subscriptionRepo.create({
      organizationId: org.id,
      planId: plan.id,
      stripeSubscriptionId: 'sub_test_existing',
      stripeCustomerId: 'cus_test',
      stripePriceId: 'price_test',
      quantity: 1,
      userCount: 1,
      billingInterval: 'month',
      price: 29,
      currency: 'EUR',
      status: 'active',
    })

    const event = buildEvent('customer.subscription.updated', {
      id: 'sub_test_existing',
      status: 'past_due',
      items: { data: [{ current_period_start: 1700000000, current_period_end: 1702592000 }] },
      trial_end: null,
      canceled_at: null,
    })

    const { signature } = signWebhook(event, secret)
    const response = await client
      .post('/webhooks/stripe')
      .header('stripe-signature', signature)
      .json(event)

    response.assertStatus(200)
    response.assertBodyContains({ received: true })

    const updated = await subscriptionRepo.findById(subscription.id)
    assert.equal(updated!.status, 'past_due')
  })

  test('ignores unknown stripe subscription ids (no row, no crash)', async ({ client }) => {
    const secret = env.get('STRIPE_WEBHOOK_SECRET')

    const event = buildEvent('customer.subscription.updated', {
      id: 'sub_unknown_xxx',
      status: 'active',
      items: { data: [{ current_period_start: 1700000000, current_period_end: 1702592000 }] },
    })

    const { signature } = signWebhook(event, secret)
    const response = await client
      .post('/webhooks/stripe')
      .header('stripe-signature', signature)
      .json(event)

    response.assertStatus(200)
    response.assertBodyContains({ received: true })
  })
})

test.group('StripeWebhookController - customer.subscription.deleted', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('marks the subscription as canceled and stamps canceledAt', async ({ client, assert }) => {
    const secret = env.get('STRIPE_WEBHOOK_SECRET')
    const subscriptionRepo = getService<SubscriptionRepository>(TYPES.SubscriptionRepository)
    const planRepo = getService<PlanRepository>(TYPES.PlanRepository)
    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    const plan = await planRepo.create({
      nameI18n: { fr: 'Pro', en: 'Pro' },
      slug: `plan-${Date.now()}`,
      pricingModel: 'flat',
      priceMonthly: 29,
      priceYearly: 290,
      currency: 'EUR',
      isActive: true,
      isVisible: true,
      sortOrder: 1,
    })

    const org = await orgRepo.create({
      name: 'Test Org Cancel',
      slug: `org-${Date.now()}`,
      isActive: true,
    })

    const subscription = await subscriptionRepo.create({
      organizationId: org.id,
      planId: plan.id,
      stripeSubscriptionId: 'sub_to_cancel',
      stripeCustomerId: 'cus_test',
      stripePriceId: 'price_test',
      quantity: 1,
      userCount: 1,
      billingInterval: 'month',
      price: 29,
      currency: 'EUR',
      status: 'active',
    })

    const event = buildEvent('customer.subscription.deleted', {
      id: 'sub_to_cancel',
      status: 'canceled',
      items: { data: [] },
    })

    const { signature } = signWebhook(event, secret)
    const response = await client
      .post('/webhooks/stripe')
      .header('stripe-signature', signature)
      .json(event)

    response.assertStatus(200)

    const updated = await subscriptionRepo.findById(subscription.id)
    assert.equal(updated!.status, 'canceled')
    assert.isNotNull(updated!.canceledAt)
  })
})

test.group('StripeWebhookController - invoice.payment_failed', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('marks the subscription as past_due when payment fails', async ({ client, assert }) => {
    const secret = env.get('STRIPE_WEBHOOK_SECRET')
    const subscriptionRepo = getService<SubscriptionRepository>(TYPES.SubscriptionRepository)
    const planRepo = getService<PlanRepository>(TYPES.PlanRepository)
    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    const plan = await planRepo.create({
      nameI18n: { fr: 'Pro', en: 'Pro' },
      slug: `plan-${Date.now()}`,
      pricingModel: 'flat',
      priceMonthly: 29,
      priceYearly: 290,
      currency: 'EUR',
      isActive: true,
      isVisible: true,
      sortOrder: 1,
    })

    const org = await orgRepo.create({
      name: 'Test Org PastDue',
      slug: `org-${Date.now()}`,
      isActive: true,
    })

    const subscription = await subscriptionRepo.create({
      organizationId: org.id,
      planId: plan.id,
      stripeSubscriptionId: 'sub_paymentfail',
      stripeCustomerId: 'cus_test',
      stripePriceId: 'price_test',
      quantity: 1,
      userCount: 1,
      billingInterval: 'month',
      price: 29,
      currency: 'EUR',
      status: 'active',
      currentPeriodStart: DateTime.now(),
      currentPeriodEnd: DateTime.now().plus({ days: 30 }),
    })

    const event = buildEvent('invoice.payment_failed', {
      id: 'in_failed',
      parent: { subscription_details: { subscription: 'sub_paymentfail' } },
    })

    const { signature } = signWebhook(event, secret)
    const response = await client
      .post('/webhooks/stripe')
      .header('stripe-signature', signature)
      .json(event)

    response.assertStatus(200)

    const updated = await subscriptionRepo.findById(subscription.id)
    assert.equal(updated!.status, 'past_due')
  })
})
