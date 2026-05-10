import { inject, injectable } from 'inversify'
import { TYPES } from '#shared/container/types'
import type UserRepository from '#users/repositories/user_repository'
import type SessionRepository from '#sessions/repositories/session_repository'
import type EmailLogRepository from '#mailing/repositories/email_log_repository'
import type OrganizationRepository from '#organizations/repositories/organization_repository'
import type RoleRepository from '#roles/repositories/role_repository'
import type IntegrationRepository from '#integrations/repositories/integration_repository'
import type { EmailLogStatus } from '#mailing/models/email_log'
import type Integration from '#integrations/models/integration'
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

interface EmailLogsFilters {
  page?: number
  perPage?: number
  status?: EmailLogStatus
  category?: string
  search?: string
}

interface EmailLogsResult {
  data: any[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

interface EmailLogsStats {
  total: number
  sent: number
  failed: number
  delivered: number
  pending: number
  byCategory: { category: string; count: number }[]
}

interface OrganizationWithMembersCount {
  id: string
  name: string
  slug: string
  descriptionI18n: { fr?: string | null; en?: string | null } | null
  website: string | null
  isActive: boolean
  createdAt: string
  membersCount: number
}

interface OrganizationMember {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  role: string
  joinedAt: string
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

@injectable()
export default class AdminService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: UserRepository,
    @inject(TYPES.SessionRepository) private sessionRepository: SessionRepository,
    @inject(TYPES.EmailLogRepository) private emailLogRepository: EmailLogRepository,
    @inject(TYPES.OrganizationRepository) private organizationRepository: OrganizationRepository,
    @inject(TYPES.RoleRepository) private roleRepository: RoleRepository,
    @inject(TYPES.IntegrationRepository) private integrationRepository: IntegrationRepository
  ) {}

  async getAllSubscriptions(filters?: {
    status?: string
    planId?: string
    search?: string
  }) {
    const { default: db } = await import('@adonisjs/lucid/services/db')

    let query = db
      .from('subscriptions')
      .join('organizations', 'subscriptions.organization_id', 'organizations.id')
      .join('plans', 'subscriptions.plan_id', 'plans.id')
      .select(
        'subscriptions.id',
        'subscriptions.status',
        'subscriptions.billing_interval as billingInterval',
        'subscriptions.stripe_price_id as stripePriceId',
        'subscriptions.price as subscriptionPrice',
        'subscriptions.currency as subscriptionCurrency',
        'subscriptions.current_period_start as currentPeriodStart',
        'subscriptions.current_period_end as currentPeriodEnd',
        'subscriptions.canceled_at as canceledAt',
        'subscriptions.created_at as createdAt',
        'organizations.id as organizationId',
        'organizations.name as organizationName',
        'plans.id as planId',
        'plans.name_i18n as planNameI18n',
        'plans.stripe_price_id_monthly as stripePriceIdMonthly',
        'plans.stripe_price_id_yearly as stripePriceIdYearly',
        'plans.price_monthly as priceMonthly',
        'plans.price_yearly as priceYearly',
        'plans.currency as planCurrency'
      )
      .orderBy('subscriptions.created_at', 'desc')

    // Filtres
    if (filters?.status) {
      query = query.where('subscriptions.status', filters.status)
    }

    if (filters?.planId) {
      query = query.where('subscriptions.plan_id', filters.planId)
    }

    if (filters?.search) {
      query = query.where('organizations.name', 'LIKE', `%${filters.search}%`)
    }

    return query
  }

  async getSubscriptionsStats() {
    const { default: db } = await import('@adonisjs/lucid/services/db')

    const stats = await db.from('subscriptions').select(
      db.raw('COUNT(*) as total'),
      db.raw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as active', ['active']),
      db.raw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as trialing', ['trialing']),
      db.raw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as paused', ['paused']),
      db.raw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as canceled', ['canceled']),
      db.raw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pastDue', ['past_due'])
    )

    return stats[0]
  }

  async getDashboardStats(days: number = 30): Promise<DashboardStats> {
    const [usersGrowth, sessionsGrowth, activeUsersStats, avgSessionsPerUser, revenueStats] = await Promise.all(
      [
        this.getUsersGrowth(days),
        this.getSessionsGrowth(days),
        this.getActiveUsersStats(days),
        this.getAverageSessionsPerUser(),
        this.getRevenueStats(),
      ]
    )

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
    const { default: db } = await import('@adonisjs/lucid/services/db')

    // Récupérer toutes les subscriptions actives et trialing
    const subscriptions = await db
      .from('subscriptions')
      .select('price', 'currency', 'billing_interval', 'created_at', 'status')
      .whereIn('status', ['active', 'trialing'])

    if (subscriptions.length === 0) {
      return { totalRevenue: 0, mrr: 0, currency: 'EUR' }
    }

    // Utiliser la devise de la première subscription
    const currency = subscriptions[0].currency || 'EUR'

    // Calculer le MRR (Monthly Recurring Revenue)
    let mrr = 0
    let totalRevenue = 0

    for (const sub of subscriptions) {
      const price = Number(sub.price) || 0

      // Pour le MRR, normaliser tout en mensuel
      if (sub.billing_interval === 'month') {
        mrr += price
      } else if (sub.billing_interval === 'year') {
        mrr += price / 12 // Diviser le prix annuel par 12
      }

      // Pour le CA total, calculer depuis la création
      if (sub.status !== 'trialing') { // Ne pas compter les trials dans le CA
        const createdAt = new Date(sub.created_at)
        const now = new Date()
        const diffMs = now.getTime() - createdAt.getTime()

        if (sub.billing_interval === 'month') {
          const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))
          totalRevenue += price * (months + 1) // +1 pour inclure le paiement initial
        } else if (sub.billing_interval === 'year') {
          const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))
          totalRevenue += price * (years + 1) // +1 pour inclure le paiement initial
        }
      }
    }

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100, // Arrondir à 2 décimales
      mrr: Math.round(mrr * 100) / 100,
      currency,
    }
  }

  async getUsersGrowth(days: number = 30): Promise<GrowthData[]> {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const startDate = DateTime.now().minus({ days }).toSQL()

    const rows = await db
      .from('users')
      .select(db.raw(`DATE(created_at) as date`), db.raw('COUNT(*) as count'))
      .where('created_at', '>=', startDate)
      .groupByRaw('DATE(created_at)')
      .orderBy('date', 'asc')

    const growthMap = new Map<string, number>()
    rows.forEach((row: any) => {
      growthMap.set(String(row.date).slice(0, 10), Number(row.count))
    })

    const result: GrowthData[] = []
    for (let i = 0; i < days; i++) {
      const date = DateTime.now().minus({ days: days - i - 1 })
      const dateStr = date.toISODate()
      if (dateStr) {
        result.push({ date: dateStr, count: growthMap.get(dateStr) || 0 })
      }
    }

    return result
  }

  async getSessionsGrowth(days: number = 30): Promise<GrowthData[]> {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const startDate = DateTime.now().minus({ days }).toSQL()

    const rows = await db
      .from('user_sessions')
      .select(db.raw(`DATE(started_at) as date`), db.raw('COUNT(*) as count'))
      .where('started_at', '>=', startDate)
      .groupByRaw('DATE(started_at)')
      .orderBy('date', 'asc')

    const growthMap = new Map<string, number>()
    rows.forEach((row: any) => {
      growthMap.set(String(row.date).slice(0, 10), Number(row.count))
    })

    const result: GrowthData[] = []
    for (let i = 0; i < days; i++) {
      const date = DateTime.now().minus({ days: days - i - 1 })
      const dateStr = date.toISODate()
      if (dateStr) {
        result.push({ date: dateStr, count: growthMap.get(dateStr) || 0 })
      }
    }

    return result
  }

  async getActiveUsersStats(days: number = 30): Promise<ActiveUsersStats> {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const thresholdDate = DateTime.now().minus({ days }).toSQL()

    const [totalRow, activeRow] = await Promise.all([
      db.from('users').count('* as total').first(),
      db
        .from('user_sessions')
        .select('user_id')
        .where('last_activity', '>=', thresholdDate)
        .groupBy('user_id')
        .count('* as sessions_count')
        .then((rows) => ({ activeUsers: rows.length })),
    ])

    const totalUsers = Number((totalRow as any)?.total || 0)
    const activeUsers = activeRow.activeUsers
    const inactiveUsers = totalUsers - activeUsers
    const activePercentage = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0

    return { activeUsers, inactiveUsers, totalUsers, activePercentage }
  }

  async getAverageSessionsPerUser(): Promise<number> {
    const { default: db } = await import('@adonisjs/lucid/services/db')

    const rows = await db
      .from('user_sessions')
      .select('user_id')
      .count('* as session_count')
      .groupBy('user_id')

    if (rows.length === 0) return 0

    const totalSessions = rows.reduce((sum: number, row: any) => sum + Number(row.session_count), 0)

    return Math.round((totalSessions / rows.length) * 100) / 100
  }

  async getUsersWithLastActivity(
    page: number = 1,
    perPage: number = 20
  ): Promise<{ data: UserWithActivity[]; meta: { total: number; perPage: number; currentPage: number } }> {
    const { default: db } = await import('@adonisjs/lucid/services/db')

    const offset = (page - 1) * perPage

    const [users, totalRow, lastActivities] = await Promise.all([
      db
        .from('users')
        .select(
          'id',
          'full_name as fullName',
          'email',
          'avatar_url as avatarUrl',
          'google_id as googleId',
          'is_email_verified as isEmailVerified',
          'created_at as createdAt'
        )
        .orderBy('created_at', 'desc')
        .offset(offset)
        .limit(perPage),
      db.from('users').count('* as total').first(),
      db
        .from('user_sessions')
        .select('user_id')
        .max('last_activity as lastActivity')
        .groupBy('user_id'),
    ])

    const total = Number((totalRow as any)?.total || 0)

    const lastActivityMap = new Map<string, DateTime>()
    lastActivities.forEach((row: any) => {
      if (row.lastActivity) {
        lastActivityMap.set(row.user_id, DateTime.fromJSDate(new Date(row.lastActivity)))
      }
    })

    return {
      data: users.map((user: any) => ({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        googleId: user.googleId,
        isEmailVerified: Boolean(user.isEmailVerified),
        createdAt: new Date(user.createdAt).toISOString(),
        lastActivity: lastActivityMap.get(user.id) || null,
      })),
      meta: { total, perPage, currentPage: page },
    }
  }

  async getUserSessions(userId: string) {
    return this.sessionRepository.findByUserId(userId)
  }

  async getEmailLogs(filters: EmailLogsFilters = {}): Promise<EmailLogsResult> {
    const page = filters.page || 1
    const perPage = filters.perPage || 20

    const query = this.emailLogRepository['buildBaseQuery']()

    if (filters.status) {
      query.where('status', filters.status)
    }

    if (filters.category) {
      query.where('category', filters.category)
    }

    if (filters.search) {
      query.where('recipient', 'LIKE', `%${filters.search}%`)
    }

    const totalQuery = query.clone()
    const total = await totalQuery.count('* as total')
    const totalCount = Number(total[0].$extras.total)

    const data = await query
      .orderBy('created_at', 'desc')
      .offset((page - 1) * perPage)
      .limit(perPage)

    const lastPage = Math.ceil(totalCount / perPage)

    return {
      data: data.map((log) => ({
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
        openedAt: log.openedAt?.toISO() || null,
        clickedAt: log.clickedAt?.toISO() || null,
        sentAt: log.sentAt?.toISO() || null,
        deliveredAt: log.deliveredAt?.toISO() || null,
        failedAt: log.failedAt?.toISO() || null,
        createdAt: log.createdAt.toISO(),
        hasAttachments: log.attachmentsMetadata && log.attachmentsMetadata.length > 0,
      })),
      meta: {
        total: totalCount,
        perPage,
        currentPage: page,
        lastPage,
      },
    }
  }

  async getEmailLogsStats(): Promise<EmailLogsStats> {
    const { default: db } = await import('@adonisjs/lucid/services/db')

    const stats = await db.from('email_logs').select(
      db.raw('COUNT(*) as total'),
      db.raw(`SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent`),
      db.raw(`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed`),
      db.raw(`SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered`),
      db.raw(`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending`)
    )

    const row = stats[0] as any
    const byCategory = await this.emailLogRepository.getStatsByCategory()

    return {
      total: Number(row.total || 0),
      sent: Number(row.sent || 0),
      failed: Number(row.failed || 0),
      delivered: Number(row.delivered || 0),
      pending: Number(row.pending || 0),
      byCategory,
    }
  }

  async getOrganizations(
    page: number = 1,
    perPage: number = 20
  ): Promise<{ data: OrganizationWithMembersCount[]; meta: { total: number; perPage: number; currentPage: number } }> {
    const { default: db } = await import('@adonisjs/lucid/services/db')

    const offset = (page - 1) * perPage

    const [rows, totalRow, membersCounts] = await Promise.all([
      db
        .from('organizations')
        .select(
          'id',
          'name',
          'slug',
          'description_i18n as descriptionI18n',
          'website',
          'is_active as isActive',
          'created_at as createdAt'
        )
        .orderBy('created_at', 'desc')
        .offset(offset)
        .limit(perPage),
      db.from('organizations').count('* as total').first(),
      db
        .from('user_organizations')
        .select('organization_id')
        .count('* as members_count')
        .groupBy('organization_id'),
    ])

    const total = Number((totalRow as any)?.total || 0)

    const membersCountMap = new Map<string, number>()
    membersCounts.forEach((row: any) => {
      membersCountMap.set(row.organization_id, Number(row.members_count))
    })

    return {
      data: rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        descriptionI18n: typeof row.descriptionI18n === 'string'
          ? JSON.parse(row.descriptionI18n)
          : row.descriptionI18n,
        website: row.website,
        isActive: Boolean(row.isActive),
        createdAt: new Date(row.createdAt).toISOString(),
        membersCount: membersCountMap.get(row.id) || 0,
      })),
      meta: { total, perPage, currentPage: page },
    }
  }

  async getOrganizationDetail(organizationId: string): Promise<OrganizationDetail> {
    const { default: db } = await import('@adonisjs/lucid/services/db')

    const organization = await this.organizationRepository.findByIdOrFail(organizationId)

    const members = await db
      .from('user_organizations')
      .join('users', 'user_organizations.user_id', 'users.id')
      .where('user_organizations.organization_id', organizationId)
      .select(
        'users.id',
        'users.full_name as fullName',
        'users.email',
        'users.avatar_url as avatarUrl',
        'user_organizations.role',
        'user_organizations.joined_at as joinedAt'
      )

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        descriptionI18n: organization.descriptionI18n,
        website: organization.website,
        isActive: organization.isActive,
        createdAt: organization.createdAt.toISO()!,
        updatedAt: organization.updatedAt.toISO()!,
      },
      members: members.map((member: any) => ({
        id: member.id,
        fullName: member.fullName,
        email: member.email,
        avatarUrl: member.avatarUrl,
        role: member.role,
        joinedAt: new Date(member.joinedAt).toISOString(),
      })),
    }
  }

  async addUserToOrganization(
    organizationId: string,
    userEmail: string,
    role: string
  ): Promise<void> {
    const user = await this.userRepository.findByEmail(userEmail)
    if (!user) {
      throw new Error('Utilisateur introuvable')
    }

    const isMember = await this.organizationRepository.isUserMember(organizationId, user.id)
    if (isMember) {
      throw new Error('Cet utilisateur est déjà membre de cette organisation')
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
          createdAt: role.createdAt.toISO()!,
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
        createdAt: role.createdAt.toISO()!,
        updatedAt: role.updatedAt?.toISO() || role.createdAt.toISO()!,
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
    config: Record<string, any>,
    isActive: boolean
  ): Promise<Integration> {
    return this.integrationRepository.upsertIntegration(provider, config, isActive)
  }
}
