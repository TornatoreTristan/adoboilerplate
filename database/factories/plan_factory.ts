import factory from '@adonisjs/lucid/factories'
import { faker } from '@faker-js/faker'
import Plan from '#billing/models/plan'
import type { PricingModel } from '#billing/models/plan'

export const PlanFactory = factory
  .define(Plan, async () => {
    const planNames = ['Starter', 'Pro', 'Business', 'Enterprise', 'Basic']
    const nameBase = faker.helpers.arrayElement(planNames)
    const uniqueSuffix = faker.string.alphanumeric(4).toLowerCase()

    return {
      nameI18n: {
        fr: nameBase,
        en: nameBase,
      },
      slug: `${nameBase.toLowerCase()}-${uniqueSuffix}`,
      descriptionI18n: {
        fr: faker.lorem.sentence(),
        en: faker.lorem.sentence(),
      },
      stripeProductId: null,
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      priceMonthly: faker.number.int({ min: 0, max: 500 }) * 100,
      priceYearly: faker.number.int({ min: 0, max: 5000 }) * 100,
      currency: 'eur',
      pricingModel: 'flat' as PricingModel,
      pricingTiers: null,
      trialDays: null,
      featuresI18n: null,
      limits: null,
      isActive: true,
      isVisible: true,
      sortOrder: faker.number.int({ min: 1, max: 10 }),
    }
  })
  .state('free', (plan) => {
    plan.nameI18n = { fr: 'Gratuit', en: 'Free' }
    plan.priceMonthly = 0
    plan.priceYearly = 0
  })
  .state('withTrial', (plan) => {
    plan.trialDays = faker.helpers.arrayElement([7, 14, 30])
  })
  .state('withStripe', (plan) => {
    plan.stripeProductId = `prod_${faker.string.alphanumeric(14)}`
    plan.stripePriceIdMonthly = `price_${faker.string.alphanumeric(14)}`
    plan.stripePriceIdYearly = `price_${faker.string.alphanumeric(14)}`
  })
  .state('perSeat', (plan) => {
    plan.pricingModel = 'per_seat' as PricingModel
    plan.pricingTiers = [
      { minUsers: 1, maxUsers: 10, pricePerUser: 1500 },
      { minUsers: 11, maxUsers: 50, pricePerUser: 1200 },
      { minUsers: 51, maxUsers: null, pricePerUser: 900 },
    ]
  })
  .state('yearly', (_plan, _ctx) => {})
  .state('monthly', (_plan, _ctx) => {})
  .state('inactive', (plan) => {
    plan.isActive = false
    plan.isVisible = false
  })
  .state('withFeatures', (plan) => {
    plan.featuresI18n = {
      fr: 'Stockage illimité, Support prioritaire, API access',
      en: 'Unlimited storage, Priority support, API access',
    }
  })
  .build()
