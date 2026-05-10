import factory from '@adonisjs/lucid/factories'
import { faker } from '@faker-js/faker'
import { DateTime } from 'luxon'
import Subscription from '#billing/models/subscription'
import type { SubscriptionStatus } from '#billing/models/subscription'
import type { PlanInterval } from '#billing/models/plan'
import { OrganizationFactory } from './organization_factory.js'
import { PlanFactory } from './plan_factory.js'

export const SubscriptionFactory = factory
  .define(Subscription, async () => {
    const now = DateTime.now()
    const interval: PlanInterval = faker.helpers.arrayElement(['month', 'year'])
    const periodStart = now.minus({ days: faker.number.int({ min: 1, max: 20 }) })
    const periodEnd =
      interval === 'month' ? periodStart.plus({ months: 1 }) : periodStart.plus({ years: 1 })

    return {
      organizationId: '',
      planId: '',
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      stripeSubscriptionItemId: null,
      stripePriceId: null,
      quantity: 1,
      userCount: faker.number.int({ min: 1, max: 20 }),
      billingInterval: interval,
      price: faker.number.int({ min: 0, max: 50000 }),
      currency: 'eur',
      status: 'active' as SubscriptionStatus,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialEndsAt: null,
      canceledAt: null,
    }
  })
  .state('active', (subscription) => {
    subscription.status = 'active'
    subscription.canceledAt = null
  })
  .state('canceled', (subscription) => {
    subscription.status = 'canceled'
    subscription.canceledAt = DateTime.now().minus({ days: faker.number.int({ min: 1, max: 30 }) })
  })
  .state('trialing', (subscription) => {
    subscription.status = 'trialing'
    subscription.trialEndsAt = DateTime.now().plus({ days: faker.number.int({ min: 1, max: 14 }) })
  })
  .state('pastDue', (subscription) => {
    subscription.status = 'past_due'
  })
  .state('paused', (subscription) => {
    subscription.status = 'paused'
  })
  .state('withStripe', (subscription) => {
    subscription.stripeSubscriptionId = `sub_${faker.string.alphanumeric(14)}`
    subscription.stripeCustomerId = `cus_${faker.string.alphanumeric(14)}`
    subscription.stripeSubscriptionItemId = `si_${faker.string.alphanumeric(14)}`
    subscription.stripePriceId = `price_${faker.string.alphanumeric(14)}`
  })
  .state('yearly', (subscription) => {
    subscription.billingInterval = 'year'
  })
  .state('monthly', (subscription) => {
    subscription.billingInterval = 'month'
  })
  .relation('organization', () => OrganizationFactory)
  .relation('plan', () => PlanFactory)
  .build()
