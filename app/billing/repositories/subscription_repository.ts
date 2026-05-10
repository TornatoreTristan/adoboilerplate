import { injectable } from 'inversify'
import { DateTime } from 'luxon'
import { BaseRepository } from '#shared/repositories/base_repository'
import Subscription from '#billing/models/subscription'
import type { SubscriptionStatus } from '#billing/models/subscription'
import type { PlanInterval } from '#billing/models/plan'

export interface AdminSubscriptionFilters {
  status?: string
  planId?: string
  search?: string
}

export interface SubscriptionStatusCounts {
  total: number
  active: number
  trialing: number
  paused: number
  canceled: number
  pastDue: number
}

export interface RevenueSubscription {
  price: number
  currency: string
  billingInterval: PlanInterval
  createdAt: DateTime
  status: SubscriptionStatus
}

@injectable()
export default class SubscriptionRepository extends BaseRepository<typeof Subscription> {
  protected model = Subscription

  async findByOrganizationId(organizationId: string): Promise<Subscription[]> {
    return this.buildBaseQuery()
      .where('organization_id', organizationId)
      .preload('plan')
      .orderBy('created_at', 'desc')
  }

  async findActiveByOrganizationId(organizationId: string): Promise<Subscription | null> {
    const subscriptions = await this.buildBaseQuery()
      .where('organization_id', organizationId)
      .whereIn('status', ['active', 'trialing', 'past_due'])
      .preload('plan')
      .orderBy('created_at', 'desc')
      .limit(1)

    return subscriptions[0] || null
  }

  async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null> {
    return this.findOneBy({ stripeSubscriptionId })
  }

  async findByStatus(status: SubscriptionStatus): Promise<Subscription[]> {
    return this.buildBaseQuery().where('status', status).preload('plan').preload('organization')
  }

  async findByPlanId(planId: string): Promise<Subscription[]> {
    return this.buildBaseQuery()
      .where('plan_id', planId)
      .preload('organization')
      .orderBy('created_at', 'desc')
  }

  async countByPlanId(planId: string): Promise<number> {
    const result = await this.buildBaseQuery()
      .where('plan_id', planId)
      .where('status', 'active')
      .count('* as total')

    return Number(result[0].$extras.total)
  }

  async findAllWithOrgAndPlan(filters: AdminSubscriptionFilters = {}): Promise<Subscription[]> {
    const query = this.buildBaseQuery()
      .preload('organization')
      .preload('plan')
      .orderBy('created_at', 'desc')

    if (filters.status) {
      query.where('status', filters.status)
    }
    if (filters.planId) {
      query.where('plan_id', filters.planId)
    }
    if (filters.search) {
      query.whereHas('organization', (orgQuery) => {
        orgQuery.whereILike('name', `%${filters.search}%`)
      })
    }

    return query
  }

  async getStatusCounts(): Promise<SubscriptionStatusCounts> {
    const rows = await this.buildBaseQuery().select('status').count('* as count').groupBy('status')

    const counts: SubscriptionStatusCounts = {
      total: 0,
      active: 0,
      trialing: 0,
      paused: 0,
      canceled: 0,
      pastDue: 0,
    }

    for (const row of rows) {
      const count = Number(row.$extras.count)
      counts.total += count
      const status = row.status as string
      if (status === 'active') counts.active = count
      else if (status === 'trialing') counts.trialing = count
      else if (status === 'paused') counts.paused = count
      else if (status === 'canceled') counts.canceled = count
      else if (status === 'past_due') counts.pastDue = count
    }

    return counts
  }

  async findActiveAndTrialingForRevenue(): Promise<RevenueSubscription[]> {
    const rows = await this.buildBaseQuery()
      .select('price', 'currency', 'billing_interval', 'created_at', 'status')
      .whereIn('status', ['active', 'trialing'])

    return rows.map((row) => ({
      price: Number(row.price),
      currency: row.currency,
      billingInterval: row.billingInterval,
      createdAt: row.createdAt,
      status: row.status,
    }))
  }
}
