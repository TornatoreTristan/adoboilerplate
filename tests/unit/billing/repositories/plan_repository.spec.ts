import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type PlanRepository from '#billing/repositories/plan_repository'

test.group('PlanRepository', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create a plan with flat pricing', async ({ assert }) => {
    const planRepository = getService<PlanRepository>(TYPES.PlanRepository)

    const plan = await planRepository.create({
      nameI18n: { fr: 'Starter', en: 'Starter' },
      slug: 'starter',
      descriptionI18n: { fr: 'Plan de démarrage', en: 'Starter plan' },
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'EUR',
      pricingModel: 'flat',
      pricingTiers: null,
      trialDays: 14,
      featuresI18n: { fr: '1 utilisateur, Support email', en: '1 user, Email support' },
      limits: { maxUsers: 1 },
      isActive: true,
      isVisible: true,
      sortOrder: 0,
      stripeProductId: null,
      stripePriceIdMonthly: null,
    })

    assert.exists(plan.id)
    assert.deepEqual(plan.nameI18n, { fr: 'Starter', en: 'Starter' })
    assert.equal(plan.slug, 'starter')
    assert.equal(plan.priceMonthly, 0)
    assert.equal(plan.currency, 'EUR')
    assert.equal(plan.pricingModel, 'flat')
    assert.equal(plan.trialDays, 14)
    assert.deepEqual(plan.featuresI18n, {
      fr: '1 utilisateur, Support email',
      en: '1 user, Email support',
    })
    assert.deepEqual(plan.limits, { maxUsers: 1 })
    assert.isTrue(plan.isActive)
    assert.isTrue(plan.isVisible)
  })

  test('should create a plan with per-seat pricing', async ({ assert }) => {
    const planRepository = getService<PlanRepository>(TYPES.PlanRepository)

    const plan = await planRepository.create({
      nameI18n: { fr: 'Pro', en: 'Pro' },
      slug: 'pro',
      descriptionI18n: { fr: 'Plan pro', en: 'Pro plan' },
      priceMonthly: 29,
      priceYearly: 290,
      currency: 'EUR',
      pricingModel: 'per_seat',
      pricingTiers: null,
      trialDays: null,
      featuresI18n: null,
      limits: null,
      isActive: true,
      isVisible: true,
      sortOrder: 0,
      stripeProductId: null,
      stripePriceIdMonthly: null,
    })

    assert.equal(plan.pricingModel, 'per_seat')
  })

  test('should create a plan with tiered pricing', async ({ assert }) => {
    const planRepository = getService<PlanRepository>(TYPES.PlanRepository)

    const plan = await planRepository.create({
      nameI18n: { fr: 'Enterprise', en: 'Enterprise' },
      slug: 'enterprise',
      descriptionI18n: { fr: 'Plan entreprise', en: 'Enterprise plan' },
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'EUR',
      pricingModel: 'tiered',
      pricingTiers: [
        { minUsers: 1, maxUsers: 10, price: 99 },
        { minUsers: 11, maxUsers: 50, price: 249 },
        { minUsers: 51, maxUsers: null, price: 499 },
      ],
      trialDays: null,
      featuresI18n: null,
      limits: null,
      isActive: true,
      isVisible: true,
      sortOrder: 0,
      stripeProductId: null,
      stripePriceIdMonthly: null,
    })

    assert.equal(plan.pricingModel, 'tiered')
    assert.isArray(plan.pricingTiers)
    assert.lengthOf(plan.pricingTiers!, 3)
  })

  test('should create a plan with volume pricing', async ({ assert }) => {
    const planRepository = getService<PlanRepository>(TYPES.PlanRepository)

    const plan = await planRepository.create({
      nameI18n: { fr: 'Volume', en: 'Volume' },
      slug: 'volume',
      descriptionI18n: { fr: 'Plan volume', en: 'Volume plan' },
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'EUR',
      pricingModel: 'volume',
      pricingTiers: [
        { minUsers: 1, maxUsers: 10, pricePerUser: 10 },
        { minUsers: 11, maxUsers: 50, pricePerUser: 8 },
        { minUsers: 51, maxUsers: null, pricePerUser: 5 },
      ],
      trialDays: null,
      featuresI18n: null,
      limits: null,
      isActive: true,
      isVisible: true,
      sortOrder: 0,
      stripeProductId: null,
      stripePriceIdMonthly: null,
    })

    assert.equal(plan.pricingModel, 'volume')
    assert.isArray(plan.pricingTiers)
    assert.lengthOf(plan.pricingTiers!, 3)
  })

  test('should find plan by slug', async ({ assert }) => {
    const planRepository = getService<PlanRepository>(TYPES.PlanRepository)

    await planRepository.create({
      nameI18n: { fr: 'Pro', en: 'Pro' },
      slug: 'pro',
      descriptionI18n: { fr: 'Plan pro', en: 'Pro plan' },
      priceMonthly: 49,
      priceYearly: 490,
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
    })

    const plan = await planRepository.findBySlug('pro')

    assert.exists(plan)
    assert.deepEqual(plan!.nameI18n, { fr: 'Pro', en: 'Pro' })
    assert.equal(plan!.slug, 'pro')
  })

  test('should find active and visible plans', async ({ assert }) => {
    const planRepository = getService<PlanRepository>(TYPES.PlanRepository)

    await planRepository.create({
      nameI18n: { fr: 'Visible Active', en: 'Visible Active' },
      slug: 'visible-active',
      priceMonthly: 10,
      priceYearly: 100,
      currency: 'EUR',
      pricingModel: 'flat',
      pricingTiers: null,
      isActive: true,
      isVisible: true,
      sortOrder: 1,
      descriptionI18n: null,
      trialDays: null,
      featuresI18n: null,
      limits: null,
      stripeProductId: null,
      stripePriceIdMonthly: null,
    })

    await planRepository.create({
      nameI18n: { fr: 'Hidden Active', en: 'Hidden Active' },
      slug: 'hidden-active',
      priceMonthly: 20,
      priceYearly: 200,
      currency: 'EUR',
      pricingModel: 'flat',
      pricingTiers: null,
      isActive: true,
      isVisible: false,
      sortOrder: 2,
      descriptionI18n: null,
      trialDays: null,
      featuresI18n: null,
      limits: null,
      stripeProductId: null,
      stripePriceIdMonthly: null,
    })

    await planRepository.create({
      nameI18n: { fr: 'Visible Inactive', en: 'Visible Inactive' },
      slug: 'visible-inactive',
      priceMonthly: 30,
      priceYearly: 300,
      currency: 'EUR',
      pricingModel: 'flat',
      pricingTiers: null,
      isActive: false,
      isVisible: true,
      sortOrder: 3,
      descriptionI18n: null,
      trialDays: null,
      featuresI18n: null,
      limits: null,
      stripeProductId: null,
      stripePriceIdMonthly: null,
    })

    const plans = await planRepository.findActiveAndVisible()

    assert.equal(plans.length, 1)
    assert.deepEqual(plans[0].nameI18n, { fr: 'Visible Active', en: 'Visible Active' })
  })

  test('should update plan', async ({ assert }) => {
    const planRepository = getService<PlanRepository>(TYPES.PlanRepository)

    const plan = await planRepository.create({
      nameI18n: { fr: 'Original', en: 'Original' },
      slug: 'original',
      priceMonthly: 10,
      priceYearly: 100,
      currency: 'EUR',
      pricingModel: 'flat',
      pricingTiers: null,
      descriptionI18n: null,
      trialDays: null,
      featuresI18n: null,
      limits: null,
      isActive: true,
      isVisible: true,
      sortOrder: 0,
      stripeProductId: null,
      stripePriceIdMonthly: null,
    })

    const updated = await planRepository.update(plan.id, {
      nameI18n: { fr: 'Updated', en: 'Updated' },
      priceMonthly: 20,
      priceYearly: 200,
    })

    assert.deepEqual(updated.nameI18n, { fr: 'Updated', en: 'Updated' })
    assert.equal(updated.priceMonthly, 20)
    assert.equal(updated.slug, 'original')
  })

  test('should delete plan', async ({ assert }) => {
    const planRepository = getService<PlanRepository>(TYPES.PlanRepository)

    const plan = await planRepository.create({
      nameI18n: { fr: 'To Delete', en: 'To Delete' },
      slug: 'to-delete',
      priceMonthly: 10,
      priceYearly: 100,
      currency: 'EUR',
      pricingModel: 'flat',
      pricingTiers: null,
      descriptionI18n: null,
      trialDays: null,
      featuresI18n: null,
      limits: null,
      isActive: true,
      isVisible: true,
      sortOrder: 0,
      stripeProductId: null,
      stripePriceIdMonthly: null,
    })

    await planRepository.delete(plan.id)

    const found = await planRepository.findById(plan.id)
    assert.isNull(found)
  })
})
