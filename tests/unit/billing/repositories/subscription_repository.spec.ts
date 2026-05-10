import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import SubscriptionRepository from '#billing/repositories/subscription_repository'
import PlanRepository from '#billing/repositories/plan_repository'
import OrganizationRepository from '#organizations/repositories/organization_repository'

async function createPlan(slug: string) {
  const planRepo = getService<PlanRepository>(TYPES.PlanRepository)
  return planRepo.create({
    nameI18n: { fr: slug, en: slug },
    slug,
    descriptionI18n: { fr: slug, en: slug },
    priceMonthly: 10,
    priceYearly: 100,
    currency: 'EUR',
    pricingModel: 'flat',
    pricingTiers: null,
    trialDays: null,
    featuresI18n: null,
    limits: null,
    isActive: true,
    isVisible: true,
    sortOrder: 0,
    stripeProductId: null,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
  } as any)
}

async function createOrg(slug: string) {
  const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)
  return orgRepo.create({
    name: slug,
    slug,
    isActive: true,
  } as any)
}

test.group('SubscriptionRepository - admin methods', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('findAllWithOrgAndPlan returns subscriptions with organization and plan preloaded', async ({ assert }) => {
    const repo = getService<SubscriptionRepository>(TYPES.SubscriptionRepository)
    const plan = await createPlan('basic-1')
    const org = await createOrg('org-1')

    await repo.create({
      organizationId: org.id,
      planId: plan.id,
      status: 'active',
      billingInterval: 'month',
      price: 10,
      currency: 'EUR',
      quantity: 1,
      userCount: 1,
    } as any)

    const result = await repo.findAllWithOrgAndPlan()

    assert.equal(result.length, 1)
    assert.equal(result[0].organization.id, org.id)
    assert.equal(result[0].plan.id, plan.id)
  })

  test('findAllWithOrgAndPlan filters by status', async ({ assert }) => {
    const repo = getService<SubscriptionRepository>(TYPES.SubscriptionRepository)
    const plan = await createPlan('basic-2')
    const org = await createOrg('org-2')

    await repo.create({
      organizationId: org.id,
      planId: plan.id,
      status: 'active',
      billingInterval: 'month',
      price: 10,
      currency: 'EUR',
      quantity: 1,
      userCount: 1,
    } as any)
    await repo.create({
      organizationId: org.id,
      planId: plan.id,
      status: 'canceled',
      billingInterval: 'month',
      price: 10,
      currency: 'EUR',
      quantity: 1,
      userCount: 1,
    } as any)

    const result = await repo.findAllWithOrgAndPlan({ status: 'active' })
    assert.equal(result.length, 1)
    assert.equal(result[0].status, 'active')
  })

  test('findAllWithOrgAndPlan filters by planId', async ({ assert }) => {
    const repo = getService<SubscriptionRepository>(TYPES.SubscriptionRepository)
    const planA = await createPlan('basic-3')
    const planB = await createPlan('basic-4')
    const org = await createOrg('org-3')

    await repo.create({
      organizationId: org.id, planId: planA.id, status: 'active',
      billingInterval: 'month', price: 10, currency: 'EUR', quantity: 1, userCount: 1,
    } as any)
    await repo.create({
      organizationId: org.id, planId: planB.id, status: 'active',
      billingInterval: 'month', price: 20, currency: 'EUR', quantity: 1, userCount: 1,
    } as any)

    const result = await repo.findAllWithOrgAndPlan({ planId: planA.id })
    assert.equal(result.length, 1)
    assert.equal(result[0].planId, planA.id)
  })

  test('findAllWithOrgAndPlan filters by organization name search', async ({ assert }) => {
    const repo = getService<SubscriptionRepository>(TYPES.SubscriptionRepository)
    const plan = await createPlan('basic-5')
    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    const acme = await orgRepo.create({ name: 'Acme Inc', slug: 'acme', isActive: true } as any)
    const globex = await orgRepo.create({ name: 'Globex', slug: 'globex', isActive: true } as any)

    await repo.create({
      organizationId: acme.id, planId: plan.id, status: 'active',
      billingInterval: 'month', price: 10, currency: 'EUR', quantity: 1, userCount: 1,
    } as any)
    await repo.create({
      organizationId: globex.id, planId: plan.id, status: 'active',
      billingInterval: 'month', price: 10, currency: 'EUR', quantity: 1, userCount: 1,
    } as any)

    const result = await repo.findAllWithOrgAndPlan({ search: 'Acme' })
    assert.equal(result.length, 1)
    assert.equal(result[0].organizationId, acme.id)
  })

  test('getStatusCounts returns counts per status', async ({ assert }) => {
    const repo = getService<SubscriptionRepository>(TYPES.SubscriptionRepository)
    const plan = await createPlan('basic-6')
    const org = await createOrg('org-6')

    const statuses = ['active', 'active', 'trialing', 'canceled', 'past_due']
    for (const status of statuses) {
      await repo.create({
        organizationId: org.id, planId: plan.id, status,
        billingInterval: 'month', price: 10, currency: 'EUR', quantity: 1, userCount: 1,
      } as any)
    }

    const counts = await repo.getStatusCounts()

    assert.equal(counts.total, 5)
    assert.equal(counts.active, 2)
    assert.equal(counts.trialing, 1)
    assert.equal(counts.canceled, 1)
    assert.equal(counts.pastDue, 1)
    assert.equal(counts.paused, 0)
  })

  test('findActiveAndTrialingForRevenue returns only active and trialing', async ({ assert }) => {
    const repo = getService<SubscriptionRepository>(TYPES.SubscriptionRepository)
    const plan = await createPlan('basic-7')
    const org = await createOrg('org-7')

    await repo.create({
      organizationId: org.id, planId: plan.id, status: 'active',
      billingInterval: 'month', price: 30, currency: 'EUR', quantity: 1, userCount: 1,
    } as any)
    await repo.create({
      organizationId: org.id, planId: plan.id, status: 'trialing',
      billingInterval: 'year', price: 300, currency: 'EUR', quantity: 1, userCount: 1,
    } as any)
    await repo.create({
      organizationId: org.id, planId: plan.id, status: 'canceled',
      billingInterval: 'month', price: 30, currency: 'EUR', quantity: 1, userCount: 1,
    } as any)

    const result = await repo.findActiveAndTrialingForRevenue()

    assert.equal(result.length, 2)
    const statuses = result.map((s) => s.status).sort()
    assert.deepEqual(statuses, ['active', 'trialing'])
    // shape: only the fields needed for revenue computation
    assert.exists(result[0].price)
    assert.exists(result[0].currency)
    assert.exists(result[0].billingInterval)
    assert.exists(result[0].createdAt)
    assert.exists(result[0].status)
    assert.isTrue(DateTime.isDateTime(result[0].createdAt))
  })
})
