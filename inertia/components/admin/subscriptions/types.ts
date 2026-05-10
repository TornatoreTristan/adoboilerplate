export interface Subscription {
  id: string
  status: string
  billingInterval: 'month' | 'year'
  stripePriceId: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  canceledAt: string | null
  createdAt: string
  organizationId: string
  organizationName: string
  planId: string
  planNameI18n: { fr: string; en: string }
  stripePriceIdMonthly: string | null
  stripePriceIdYearly: string | null
  subscriptionPrice: number
  subscriptionCurrency: string
  priceMonthly: number
  priceYearly: number
  planCurrency: string
}

export interface Plan {
  id: string
  nameI18n: { fr: string; en: string }
}

export interface Stats {
  total: number
  active: number
  trialing: number
  paused: number
  canceled: number
  pastDue: number
}

export interface Filters {
  status?: string
  planId?: string
  search?: string
}
