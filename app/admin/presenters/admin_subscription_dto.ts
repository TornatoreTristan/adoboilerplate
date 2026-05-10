import type { TranslatableField } from '#shared/helpers/translatable'
import { DateTime } from 'luxon'

type LoosePlanNameI18n = { fr?: string | null; en?: string | null } | null

export interface AdminSubscriptionDto {
  id: string
  status: string
  billingInterval: string
  stripePriceId: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  canceledAt: string | null
  createdAt: string | null
  organizationId: string
  organizationName: string | null
  planId: string
  planNameI18n: { fr?: string | null; en?: string | null } | null
  stripePriceIdMonthly: string | null
  stripePriceIdYearly: string | null
  subscriptionPrice: number | null
  subscriptionCurrency: string | null
  priceMonthly: number | null
  priceYearly: number | null
  planCurrency: string | null
}

export interface AdminPlanSummaryDto {
  id: string
  nameI18n: TranslatableField
}

type DateTimeOrNull = DateTime | null
type DateTimeOrString = DateTime | string | null

function toIsoOrNull(value: DateTimeOrNull): string | null {
  if (!value) return null
  return value.toISO() ?? null
}

function toIsoFromDateTimeOrString(value: DateTimeOrString): string | null {
  if (!value) return null
  if (value instanceof DateTime) return value.toISO() ?? null
  return value
}

export class AdminSubscriptionDtoPresenter {
  static present(sub: {
    id: string
    status: string
    billingInterval: string
    stripePriceId: string | null
    currentPeriodStart: DateTimeOrNull
    currentPeriodEnd: DateTimeOrNull
    canceledAt: DateTimeOrNull
    createdAt: DateTime
    organizationId: string
    organizationName: string | null
    planId: string
    planNameI18n: LoosePlanNameI18n
    stripePriceIdMonthly: string | null
    stripePriceIdYearly: string | null
    subscriptionPrice: number | null
    subscriptionCurrency: string | null
    priceMonthly: number | null
    priceYearly: number | null
    planCurrency: string | null
  }): AdminSubscriptionDto {
    return {
      id: sub.id,
      status: sub.status,
      billingInterval: sub.billingInterval,
      stripePriceId: sub.stripePriceId,
      currentPeriodStart: toIsoOrNull(sub.currentPeriodStart),
      currentPeriodEnd: toIsoOrNull(sub.currentPeriodEnd),
      canceledAt: toIsoOrNull(sub.canceledAt),
      createdAt: toIsoFromDateTimeOrString(sub.createdAt),
      organizationId: sub.organizationId,
      organizationName: sub.organizationName,
      planId: sub.planId,
      planNameI18n: sub.planNameI18n,
      stripePriceIdMonthly: sub.stripePriceIdMonthly,
      stripePriceIdYearly: sub.stripePriceIdYearly,
      subscriptionPrice: sub.subscriptionPrice,
      subscriptionCurrency: sub.subscriptionCurrency,
      priceMonthly: sub.priceMonthly,
      priceYearly: sub.priceYearly,
      planCurrency: sub.planCurrency,
    }
  }

  static presentPlanSummary(plan: { id: string; nameI18n: TranslatableField }): AdminPlanSummaryDto {
    return {
      id: plan.id,
      nameI18n: plan.nameI18n,
    }
  }
}
