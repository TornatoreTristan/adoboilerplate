export type PricingModel = 'flat' | 'per_seat' | 'tiered' | 'volume'

export interface PricingTier {
  minUsers: number
  maxUsers: number | null
  price?: number
  pricePerUser?: number
}

/**
 * Shape shared by `create` and `edit`. The two pages wire it through
 * `useForm<PlanFormData>(...)` so every sub-card sees the same data + errors
 * + setData signature.
 *
 * `syncWithStripe` is optional because only the create flow can ask Stripe
 * to provision the product/price — the edit flow updates an existing pair
 * and never re-creates them.
 */
export interface PlanFormData {
  name: string
  slug: string
  description: string
  priceMonthly: number
  priceYearly: number
  currency: string
  pricingModel: PricingModel
  pricingTiers: PricingTier[]
  trialDays: number
  features: string[]
  limits: Record<string, unknown>
  isActive: boolean
  isVisible: boolean
  sortOrder: number
  syncWithStripe?: boolean
}

export type PlanFormErrors = Partial<Record<keyof PlanFormData, string>>

/**
 * Type-safe useForm setter — mirrors the signature returned by
 * @inertiajs/react's useForm so every card can declare it without
 * importing inertia internals.
 */
export type SetPlanField = <K extends keyof PlanFormData>(field: K, value: PlanFormData[K]) => void
