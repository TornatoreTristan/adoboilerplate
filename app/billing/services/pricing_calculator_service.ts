import { injectable } from 'inversify'
import Plan, { type PricingModel, type PricingTier, type PlanInterval } from '#billing/models/plan'
import { E } from '#shared/exceptions/exception_helpers'

/**
 * Shape consumed by the pricing calculator. A real Plan model exposes
 * `priceMonthly` / `priceYearly` instead of a single `price` and does not carry
 * `baseUsers` / `pricePerUser` (those live in `pricingTiers`). The calculator
 * works against this normalised view so callers can either pass a Plan via
 * {@link fromPlan} or build the shape directly in tests.
 */
export interface PricingInput {
  pricingModel: PricingModel
  price?: number
  baseUsers?: number
  pricePerUser?: number
  pricingTiers?: PricingTier[] | null
}

@injectable()
export default class PricingCalculatorService {
  /**
   * Build a PricingInput from a Plan + billing interval. Per-seat plans without
   * an explicit `baseUsers`/`pricePerUser` surface fall back to the first tier.
   */
  fromPlan(plan: Plan, interval: PlanInterval): PricingInput {
    const basePrice = interval === 'year' ? plan.priceYearly : plan.priceMonthly
    const firstTier = plan.pricingTiers?.[0]
    return {
      pricingModel: plan.pricingModel,
      price: basePrice,
      baseUsers: firstTier?.minUsers,
      pricePerUser: firstTier?.pricePerUser,
      pricingTiers: plan.pricingTiers ?? null,
    }
  }

  calculatePrice(input: PricingInput, userCount: number): number {
    if (userCount < 1) {
      E.fieldInvalid('userCount', userCount, { message: 'User count must be at least 1' })
    }

    switch (input.pricingModel) {
      case 'flat':
        return this.calculateFlatPrice(input)

      case 'per_seat':
        return this.calculatePerSeatPrice(input, userCount)

      case 'tiered':
        return this.calculateTieredPrice(input, userCount)

      case 'volume':
        return this.calculateVolumePrice(input, userCount)

      default:
        E.fieldInvalid('pricingModel', input.pricingModel)
    }
  }

  calculateQuantity(input: PricingInput, userCount: number): number {
    switch (input.pricingModel) {
      case 'flat':
        return 1

      case 'per_seat':
        if (!input.baseUsers) {
          return userCount
        }
        return Math.max(userCount - input.baseUsers, 0) + 1

      case 'tiered':
      case 'volume':
        return userCount

      default:
        return 1
    }
  }

  private calculateFlatPrice(input: PricingInput): number {
    if (input.price === undefined) {
      E.validationError('Flat pricing requires price to be set', 'price')
    }
    return input.price
  }

  private calculatePerSeatPrice(input: PricingInput, userCount: number): number {
    if (input.pricePerUser === undefined) {
      E.validationError('Per-seat pricing requires pricePerUser to be set', 'pricePerUser')
    }
    if (input.price === undefined) {
      E.validationError('Per-seat pricing requires price to be set', 'price')
    }

    const baseUsers = input.baseUsers || 0
    const basePrice = input.price

    if (userCount <= baseUsers) {
      return basePrice
    }

    const additionalUsers = userCount - baseUsers
    return basePrice + additionalUsers * input.pricePerUser
  }

  private calculateTieredPrice(input: PricingInput, userCount: number): number {
    if (!input.pricingTiers || input.pricingTiers.length === 0) {
      E.validationError('Tiered pricing requires pricingTiers to be set', 'pricingTiers')
    }

    const tier = this.findTierForUserCount(input.pricingTiers, userCount)

    if (!tier) {
      E.validationError(`No pricing tier found for ${userCount} users`, 'pricingTiers')
    }

    if (tier.price === undefined) {
      E.validationError('Tiered pricing tier must have a price property', 'pricingTiers')
    }

    return tier.price
  }

  private calculateVolumePrice(input: PricingInput, userCount: number): number {
    if (!input.pricingTiers || input.pricingTiers.length === 0) {
      E.validationError('Volume pricing requires pricingTiers to be set', 'pricingTiers')
    }

    let totalPrice = 0
    let remainingUsers = userCount

    const sortedTiers = this.sortTiers(input.pricingTiers)

    for (const tier of sortedTiers) {
      if (remainingUsers <= 0) break

      if (tier.pricePerUser === undefined) {
        E.validationError('Volume pricing tier must have a pricePerUser property', 'pricingTiers')
      }

      const tierCapacity = tier.maxUsers ? tier.maxUsers - tier.minUsers + 1 : Infinity
      const usersInTier = Math.min(remainingUsers, tierCapacity)

      totalPrice += usersInTier * tier.pricePerUser
      remainingUsers -= usersInTier
    }

    return totalPrice
  }

  private findTierForUserCount(tiers: PricingTier[], userCount: number): PricingTier | null {
    for (const tier of tiers) {
      const meetsMin = userCount >= tier.minUsers
      const meetsMax = tier.maxUsers === null || userCount <= tier.maxUsers

      if (meetsMin && meetsMax) {
        return tier
      }
    }

    return null
  }

  private sortTiers(tiers: PricingTier[]): PricingTier[] {
    return [...tiers].sort((a, b) => a.minUsers - b.minUsers)
  }
}
