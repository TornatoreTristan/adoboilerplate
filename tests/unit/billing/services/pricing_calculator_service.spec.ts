import { test } from '@japa/runner'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type PricingCalculatorService from '#billing/services/pricing_calculator_service'
import Plan from '#billing/models/plan'

test.group('PricingCalculatorService', () => {
  test('should calculate flat price correctly', async ({ assert }) => {
    const calculator = getService<PricingCalculatorService>(TYPES.PricingCalculatorService)

    const plan = new Plan() as any
    plan.pricingModel = 'flat'
    plan.price = 29.99

    const price = calculator.calculatePrice(plan, 1)
    assert.equal(price, 29.99)

    const price10 = calculator.calculatePrice(plan, 10)
    assert.equal(price10, 29.99)
  })

  test('should calculate per-seat price correctly', async ({ assert }) => {
    const calculator = getService<PricingCalculatorService>(TYPES.PricingCalculatorService)

    const plan = new Plan() as any
    plan.pricingModel = 'per_seat'
    plan.price = 29
    plan.baseUsers = 5
    plan.pricePerUser = 5

    const price5 = calculator.calculatePrice(plan, 5)
    assert.equal(price5, 29)

    const price10 = calculator.calculatePrice(plan, 10)
    assert.equal(price10, 54)
  })

  test('should calculate tiered price correctly', async ({ assert }) => {
    const calculator = getService<PricingCalculatorService>(TYPES.PricingCalculatorService)

    const plan = new Plan() as any
    plan.pricingModel = 'tiered'
    plan.pricingTiers = [
      { minUsers: 1, maxUsers: 10, price: 99 },
      { minUsers: 11, maxUsers: 50, price: 249 },
      { minUsers: 51, maxUsers: null, price: 499 },
    ]

    const price5 = calculator.calculatePrice(plan, 5)
    assert.equal(price5, 99)

    const price25 = calculator.calculatePrice(plan, 25)
    assert.equal(price25, 249)

    const price100 = calculator.calculatePrice(plan, 100)
    assert.equal(price100, 499)
  })

  test('should calculate volume price correctly', async ({ assert }) => {
    const calculator = getService<PricingCalculatorService>(TYPES.PricingCalculatorService)

    const plan = new Plan() as any
    plan.pricingModel = 'volume'
    plan.pricingTiers = [
      { minUsers: 1, maxUsers: 10, pricePerUser: 10 },
      { minUsers: 11, maxUsers: 50, pricePerUser: 8 },
      { minUsers: 51, maxUsers: null, pricePerUser: 5 },
    ]

    const price5 = calculator.calculatePrice(plan, 5)
    assert.equal(price5, 50)

    const price25 = calculator.calculatePrice(plan, 25)
    assert.equal(price25, 220)

    const price100 = calculator.calculatePrice(plan, 100)
    assert.equal(price100, 670)
  })

  test('should calculate quantity for flat pricing', async ({ assert }) => {
    const calculator = getService<PricingCalculatorService>(TYPES.PricingCalculatorService)

    const plan = new Plan() as any
    plan.pricingModel = 'flat'

    const quantity = calculator.calculateQuantity(plan, 10)
    assert.equal(quantity, 1)
  })

  test('should calculate quantity for per-seat pricing', async ({ assert }) => {
    const calculator = getService<PricingCalculatorService>(TYPES.PricingCalculatorService)

    const plan = new Plan() as any
    plan.pricingModel = 'per_seat'
    plan.baseUsers = 5

    const quantity5 = calculator.calculateQuantity(plan, 5)
    assert.equal(quantity5, 1)

    const quantity10 = calculator.calculateQuantity(plan, 10)
    assert.equal(quantity10, 6)
  })

  test('should calculate quantity for tiered pricing', async ({ assert }) => {
    const calculator = getService<PricingCalculatorService>(TYPES.PricingCalculatorService)

    const plan = new Plan() as any
    plan.pricingModel = 'tiered'

    const quantity = calculator.calculateQuantity(plan, 25)
    assert.equal(quantity, 25)
  })

  test('should throw error for invalid user count', async ({ assert }) => {
    const calculator = getService<PricingCalculatorService>(TYPES.PricingCalculatorService)

    const plan = new Plan() as any
    plan.pricingModel = 'flat'
    plan.price = 29

    assert.throws(() => calculator.calculatePrice(plan, 0))
    assert.throws(() => calculator.calculatePrice(plan, -1))
  })
})
