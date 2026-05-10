export interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  priceMonthly: number
  priceYearly: number
  currency: string
  features: string[] | null
  /**
   * The Plan model also exposes nameI18n / descriptionI18n at runtime
   * for the translation helpers. We keep the loose typing here so the
   * UI components can still call getTranslation(plan.nameI18n, …)
   * without re-declaring the shape twice.
   */
  nameI18n?: { fr: string; en: string }
  descriptionI18n?: { fr: string; en: string }
}

export interface CurrentSubscription {
  id: string
  status: string
  billingInterval: 'month' | 'year'
  quantity: number
  userCount: number
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  canceledAt: string | null
  plan: Plan
}

export interface AvailablePlan {
  id: string
  name: string
  slug: string
  description: string | null
  priceMonthly: number
  priceYearly: number
  currency: string
  pricingModel: string
  features: string[] | null
  trialDays: number | null
  sortOrder: number
}

export interface Invoice {
  id: string
  number: string | null
  status: string | null
  amountDue: number
  amountPaid: number
  currency: string
  created: number
  dueDate: number | null
  invoicePdf: string | null
  hostedInvoiceUrl: string | null
}

export const SUBSCRIPTION_MANAGER_ROLES = new Set(['owner', 'admin'])

export const SUBSCRIPTION_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  trialing: 'bg-blue-500',
  past_due: 'bg-yellow-500',
  canceled: 'bg-red-500',
  incomplete: 'bg-gray-500',
  incomplete_expired: 'bg-gray-500',
}

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-500',
  open: 'bg-blue-500',
  void: 'bg-gray-500',
  uncollectible: 'bg-red-500',
  draft: 'bg-yellow-500',
}
