import { test } from '@japa/runner'
import { createPlanValidator, updatePlanValidator } from '#billing/validators/plan_validator'

test.group('createPlanValidator', () => {
  test('accepts a minimal flat plan payload', async ({ assert }) => {
    const data = await createPlanValidator.validate({
      name: 'Starter',
      slug: 'starter',
      priceMonthly: 9,
      priceYearly: 90,
      currency: 'eur',
      pricingModel: 'flat',
    })

    // currency is upper-cased by the validator
    assert.equal(data.currency, 'EUR')
    assert.equal(data.slug, 'starter')
  })

  test('rejects a slug with invalid characters (only [a-z0-9-] allowed)', async ({ assert }) => {
    await assert.rejects(() =>
      createPlanValidator.validate({
        name: 'Bad Slug',
        slug: 'Bad Slug!',
        priceMonthly: 9,
        priceYearly: 90,
        currency: 'EUR',
        pricingModel: 'flat',
      })
    )
  })

  test('rejects a 4-letter currency code', async ({ assert }) => {
    await assert.rejects(() =>
      createPlanValidator.validate({
        name: 'X',
        slug: 'x',
        priceMonthly: 0,
        priceYearly: 0,
        currency: 'EURO',
        pricingModel: 'flat',
      })
    )
  })

  test('rejects an unknown pricing model', async ({ assert }) => {
    await assert.rejects(() =>
      createPlanValidator.validate({
        name: 'X',
        slug: 'x',
        priceMonthly: 0,
        priceYearly: 0,
        currency: 'EUR',
        pricingModel: 'invented-model',
      })
    )
  })

  test('rejects a negative monthly price', async ({ assert }) => {
    await assert.rejects(() =>
      createPlanValidator.validate({
        name: 'X',
        slug: 'x',
        priceMonthly: -1,
        priceYearly: 0,
        currency: 'EUR',
        pricingModel: 'flat',
      })
    )
  })

  test('accepts a tiered plan with pricing tiers array', async ({ assert }) => {
    const data = await createPlanValidator.validate({
      name: 'Team',
      slug: 'team',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'EUR',
      pricingModel: 'tiered',
      pricingTiers: [
        { minUsers: 1, maxUsers: 5, price: 50 },
        { minUsers: 6, maxUsers: null, pricePerUser: 8 },
      ],
    })

    assert.lengthOf(data.pricingTiers!, 2)
  })
})

test.group('updatePlanValidator', () => {
  test('accepts an empty patch (all fields optional)', async ({ assert }) => {
    const data = await updatePlanValidator.validate({})
    assert.deepEqual(data, {})
  })

  test('rejects an unknown pricing model even on update', async ({ assert }) => {
    await assert.rejects(() =>
      updatePlanValidator.validate({ pricingModel: 'invented' })
    )
  })
})
