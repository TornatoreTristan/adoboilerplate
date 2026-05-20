import { inject, injectable } from 'inversify'
import { TYPES } from '#shared/container/types'
import type UserRepository from '#users/repositories/user_repository'
import type { UserListFilters } from '#users/repositories/user_repository'
import type SessionRepository from '#sessions/repositories/session_repository'
import type EmailLogRepository from '#mailing/repositories/email_log_repository'
import type { EmailLogFilters } from '#mailing/repositories/email_log_repository'
import type OrganizationRepository from '#organizations/repositories/organization_repository'
import type {
  OrganizationWithMemberCount,
  OrganizationMember,
} from '#organizations/repositories/organization_repository'
import type RoleRepository from '#roles/repositories/role_repository'
import type IntegrationRepository from '#integrations/repositories/integration_repository'
import type SubscriptionRepository from '#billing/repositories/subscription_repository'
import type { AdminSubscriptionFilters } from '#billing/repositories/subscription_repository'
import type Integration from '#integrations/models/integration'
import { E } from '#shared/exceptions/index'
import { DateTime } from 'luxon'

interface GrowthData {
  date: string
  count: number
}

interface ActiveUsersStats {
  activeUsers: number
  inactiveUsers: number
  totalUsers: number
  activePercentage: number
}

interface DashboardStats {
  usersGrowth: GrowthData[]
  sessionsGrowth: GrowthData[]
  avgSessionsPerUser: number
  activeUsers: number
  inactiveUsers: number
  totalUsers: number
  totalRevenue: number
  mrr: number
  currency: string
}

interface UserWithActivity {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  googleId: string | null
  isEmailVerified: boolean
  createdAt: string
  lastActivity: DateTime | null
}

interface AdminSubscriptionRow {
  id: string
  status: string
  billingInterval: string
  stripePriceId: string | null
  subscriptionPrice: number
  subscriptionCurrency: string
  currentPeriodStart: DateTime | null
  currentPeriodEnd: DateTime | null
  canceledAt: DateTime | null
  createdAt: DateTime
  organizationId: string
  organizationName: string
  planId: string
  planNameI18n: { fr?: string | null; en?: string | null } | null
  stripePriceIdMonthly: string | null
  stripePriceIdYearly: string | null
  priceMonthly: number | null
  priceYearly: number | null
  planCurrency: string | null
}

interface OrganizationDetail {
  organization: {
    id: string
    name: string
    slug: string
    descriptionI18n: { fr?: string | null; en?: string | null } | null
    website: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
  members: OrganizationMember[]
}

interface RoleWithPermissionsCount {
  id: string
  name: string
  slug: string
  description: string | null
  isSystem: boolean
  createdAt: string
  permissionsCount: number
}

interface RolePermission {
  id: string
  name: string
  slug: string
  description: string | null
  resource: string
  action: string
}

interface RoleDetail {
  role: {
    id: string
    name: string
    slug: string
    description: string | null
    isSystem: boolean
    createdAt: string
    updatedAt: string
  }
  permissions: RolePermission[]
}

function fillGrowthDays(rows: { date: string; count: number }[], days: number): GrowthData[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(row.date, row.count)
  }

  const result: GrowthData[] = []
  for (let i = 0; i < days; i++) {
    const date = DateTime.now().minus({ days: days - i - 1 })
    const dateStr = date.toISODate()
    if (dateStr) {
      result.push({ date: dateStr, count: map.get(dateStr) ?? 0 })
    }
  }
  return result
}

@injectable()
export default class AdminService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: UserRepository,
    @inject(TYPES.SessionRepository) private sessionRepository: SessionRepository,
    @inject(TYPES.EmailLogRepository) private emailLogRepository: EmailLogRepository,
    @inject(TYPES.OrganizationRepository) private organizationRepository: OrganizationRepository,
    @inject(TYPES.RoleRepository) private roleRepository: RoleRepository,
    @inject(TYPES.IntegrationRepository) private integrationRepository: IntegrationRepository,
    @inject(TYPES.SubscriptionRepository) private subscriptionRepository: SubscriptionRepository
  ) {}

  async getAllSubscriptions(filters?: AdminSubscriptionFilters): Promise<AdminSubscriptionRow[]> {
    const subscriptions = await this.subscriptionRepository.findAllWithOrgAndPlan(filters)

    return subscriptions.map((sub) => ({
      id: sub.id,
      status: sub.status,
      billingInterval: sub.billingInterval,
      stripePriceId: sub.stripePriceId,
      subscriptionPrice: Number(sub.price),
      subscriptionCurrency: sub.currency,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      canceledAt: sub.canceledAt,
      createdAt: sub.createdAt,
      organizationId: sub.organizationId,
      organizationName: sub.organization.name,
      planId: sub.planId,
      planNameI18n: sub.plan.nameI18n ?? null,
      stripePriceIdMonthly: sub.plan.stripePriceIdMonthly ?? null,
      stripePriceIdYearly: sub.plan.stripePriceIdYearly ?? null,
      priceMonthly: sub.plan.priceMonthly ?? null,
      priceYearly: sub.plan.priceYearly ?? null,
      planCurrency: sub.plan.currency ?? null,
    }))
  }

  async getSubscriptionsStats() {
    return this.subscriptionRepository.getStatusCounts()
  }

  async getDashboardStats(days: number = 30): Promise<DashboardStats> {
    const [usersGrowth, sessionsGrowth, activeUsersStats, avgSessionsPerUser, revenueStats] =
      await Promise.all([
        this.getUsersGrowth(days),
        this.getSessionsGrowth(days),
        this.getActiveUsersStats(days),
        this.getAverageSessionsPerUser(),
        this.getRevenueStats(),
      ])

    return {
      usersGrowth,
      sessionsGrowth,
      avgSessionsPerUser,
      activeUsers: activeUsersStats.activeUsers,
      inactiveUsers: activeUsersStats.inactiveUsers,
      totalUsers: activeUsersStats.totalUsers,
      totalRevenue: revenueStats.totalRevenue,
      mrr: revenueStats.mrr,
      currency: revenueStats.currency,
    }
  }

  async getRevenueStats(): Promise<{ totalRevenue: number; mrr: number; currency: string }> {
    const subscriptions = await this.subscriptionRepository.findActiveAndTrialingForRevenue()

    if (subscriptions.length === 0) {
      return { totalRevenue: 0, mrr: 0, currency: 'EUR' }
    }

    const currency = subscriptions[0].currency || 'EUR'
    let mrr = 0
    let totalRevenue = 0

    for (const sub of subscriptions) {
      const price = Number(sub.price) || 0

      if (sub.billingInterval === 'month') {
        mrr += price
      } else if (sub.billingInterval === 'year') {
        mrr += price / 12
      }

      if (sub.status !== 'trialing') {
        const createdAt = sub.createdAt.toJSDate()
        const diffMs = Date.now() - createdAt.getTime()

        if (sub.billingInterval === 'month') {
          const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))
          totalRevenue += price * (months + 1)
        } else if (sub.billingInterval === 'year') {
          const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))
          totalRevenue += price * (years + 1)
        }
      }
    }

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      mrr: Math.round(mrr * 100) / 100,
      currency,
    }
  }

  async getUsersGrowth(days: number = 30): Promise<GrowthData[]> {
    const dt = DateTime.now().minus({ days })
    const sinceDate = dt.toSQL() ?? dt.toISO()
    const rows = await this.userRepository.countByDay(sinceDate)
    return fillGrowthDays(rows, days)
  }

  async getSessionsGrowth(days: number = 30): Promise<GrowthData[]> {
    const dt = DateTime.now().minus({ days })
    const sinceDate = dt.toSQL() ?? dt.toISO()
    const rows = await this.sessionRepository.countByDayStarted(sinceDate)
    return fillGrowthDays(rows, days)
  }

  async getActiveUsersStats(days: number = 30): Promise<ActiveUsersStats> {
    const dt = DateTime.now().minus({ days })
    const thresholdDate = dt.toSQL() ?? dt.toISO()

    const [totalUsers, activeUsers] = await Promise.all([
      this.userRepository.count(),
      this.sessionRepository.countDistinctActiveUserIds(thresholdDate),
    ])

    const inactiveUsers = totalUsers - activeUsers
    const activePercentage = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0

    return { activeUsers, inactiveUsers, totalUsers, activePercentage }
  }

  async getAverageSessionsPerUser(): Promise<number> {
    return this.sessionRepository.getAverageSessionsPerUser()
  }

  async getUsersWithLastActivity(filters: UserListFilters = {}): Promise<{
    data: UserWithActivity[]
    meta: { total: number; perPage: number; currentPage: number; lastPage: number }
  }> {
    const [paginated, lastActivityMap] = await Promise.all([
      this.userRepository.findPaginatedWithFilters(filters),
      this.sessionRepository.getLastActivityByUser(),
    ])

    return {
      data: paginated.data.map((user) => ({
        id: user.id,
        fullName: user.fullName ?? null,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
        googleId: user.googleId ?? null,
        isEmailVerified: Boolean(user.isEmailVerified),
        createdAt: user.createdAt.toISO() ?? '',
        lastActivity: lastActivityMap.get(String(user.id)) ?? null,
      })),
      meta: paginated.meta,
    }
  }

  async getUserSessions(userId: string) {
    return this.sessionRepository.findByUserId(userId)
  }

  async getEmailLogs(filters: EmailLogFilters = {}) {
    const result = await this.emailLogRepository.findPaginatedWithFilters(filters)

    return {
      data: result.data.map((log) => ({
        id: log.id,
        userId: log.userId,
        recipient: log.recipient,
        subject: log.subject,
        category: log.category,
        status: log.status,
        providerId: log.providerId,
        errorMessage: log.errorMessage,
        opensCount: log.opensCount,
        clicksCount: log.clicksCount,
        openedAt: log.openedAt?.toISO() ?? null,
        clickedAt: log.clickedAt?.toISO() ?? null,
        sentAt: log.sentAt?.toISO() ?? null,
        deliveredAt: log.deliveredAt?.toISO() ?? null,
        failedAt: log.failedAt?.toISO() ?? null,
        createdAt: log.createdAt.toISO(),
        hasAttachments: log.attachmentsMetadata && log.attachmentsMetadata.length > 0,
      })),
      meta: result.meta,
    }
  }

  async getEmailLogsStats() {
    const [counts, byCategory] = await Promise.all([
      this.emailLogRepository.getStatusCounts(),
      this.emailLogRepository.getStatsByCategory(),
    ])

    return { ...counts, byCategory }
  }

  async getOrganizations(
    page: number = 1,
    perPage: number = 20
  ): Promise<{
    data: OrganizationWithMemberCount[]
    meta: { total: number; perPage: number; currentPage: number }
  }> {
    return this.organizationRepository.findPaginatedWithMemberCounts(page, perPage)
  }

  async getOrganizationDetail(organizationId: string): Promise<OrganizationDetail> {
    const organization = await this.organizationRepository.findByIdOrFail(organizationId)
    const members = await this.organizationRepository.getMembers(organizationId)

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        descriptionI18n: organization.descriptionI18n ?? null,
        website: organization.website,
        isActive: organization.isActive,
        createdAt: organization.createdAt.toISO() ?? '',
        updatedAt: organization.updatedAt.toISO() ?? '',
      },
      members,
    }
  }

  async addUserToOrganization(
    organizationId: string,
    userEmail: string,
    role: string
  ): Promise<void> {
    const user = await this.userRepository.findByEmail(userEmail)
    if (!user) {
      E.userNotFound(userEmail)
    }

    const isMember = await this.organizationRepository.isUserMember(organizationId, user.id)
    if (isMember) {
      E.validationError('Cet utilisateur est déjà membre de cette organisation')
    }

    await this.organizationRepository.addUser(organizationId, user.id, role)
  }

  async getRoles(): Promise<RoleWithPermissionsCount[]> {
    const roles = await this.roleRepository.findAll()

    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const permissions = await this.roleRepository.getPermissions(role.id)
        return {
          id: role.id,
          name: role.name,
          slug: role.slug,
          description: role.description,
          isSystem: role.isSystem,
          createdAt: role.createdAt.toISO() ?? '',
          permissionsCount: permissions.length,
        }
      })
    )

    return rolesWithPermissions
  }

  async getRoleDetail(roleId: string): Promise<RoleDetail> {
    const role = await this.roleRepository.findByIdOrFail(roleId)
    const permissions = await this.roleRepository.getPermissions(roleId)

    return {
      role: {
        id: role.id,
        name: role.name,
        slug: role.slug,
        description: role.description,
        isSystem: role.isSystem,
        createdAt: role.createdAt.toISO() ?? '',
        updatedAt: role.updatedAt?.toISO() ?? role.createdAt.toISO() ?? '',
      },
      permissions: permissions.map((permission) => ({
        id: permission.id,
        name: permission.name,
        slug: permission.slug,
        description: permission.description,
        resource: permission.resource,
        action: permission.action,
      })),
    }
  }

  async getIntegrations(): Promise<Integration[]> {
    return this.integrationRepository.findAll()
  }

  async getIntegration(provider: string): Promise<Integration | null> {
    return this.integrationRepository.findByProvider(provider)
  }

  async configureIntegration(
    provider: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- config shape varies per integration provider
    config: Record<string, any>,
    isActive: boolean
  ): Promise<Integration> {
    return this.integrationRepository.upsertIntegration(provider, config, isActive)
  }
}
