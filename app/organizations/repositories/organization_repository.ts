import { injectable } from 'inversify'
import Organization from '#organizations/models/organization'
import { BaseRepository } from '#shared/repositories/base_repository'

export interface OrganizationWithMemberCount {
  id: string
  name: string
  slug: string
  descriptionI18n: { fr?: string | null; en?: string | null } | null
  website: string | null
  isActive: boolean
  createdAt: string
  membersCount: number
}

export interface OrganizationMember {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  role: string
  joinedAt: string
}

export interface PaginatedOrganizations {
  data: OrganizationWithMemberCount[]
  meta: {
    total: number
    perPage: number
    currentPage: number
  }
}

@injectable()
export default class OrganizationRepository extends BaseRepository<typeof Organization> {
  protected model = Organization

  /**
   * Trouver une organisation par slug
   */
  async findBySlug(slug: string): Promise<Organization | null> {
    return this.findOneBy({ slug }, {
      cache: { ttl: 600, tags: ['organizations', 'org_slug'] }
    })
  }

  /**
   * Trouver une organisation avec ses membres
   */
  async findWithMembers(id: string | number): Promise<Organization | null> {
    const org = await this.findById(id)
    if (org) {
      await org.load('users')
    }
    return org
  }

  /**
   * Vérifier si un slug existe déjà
   */
  async slugExists(slug: string, excludeId?: string | number): Promise<boolean> {
    const criteria: Record<string, any> = { slug }

    if (excludeId) {
      const orgs = await this.findBy(criteria)
      return orgs.some(org => org.id !== excludeId)
    }

    return this.exists(criteria)
  }

  /**
   * Rechercher des organisations par nom
   */
  async search(term: string, limit: number = 10): Promise<Organization[]> {
    const query = this.buildBaseQuery()

    return query
      .where('name', 'LIKE', `%${term}%`)
      .limit(limit)
  }

  /**
   * Obtenir les organisations d'un utilisateur avec son rôle
   */
  async findByUserId(userId: string | number): Promise<Array<Organization & { pivot_role: string }>> {
    const query = this.buildBaseQuery()

    const results = await query
      .join('user_organizations', 'organizations.id', 'user_organizations.organization_id')
      .where('user_organizations.user_id', userId)
      .select('organizations.*', 'user_organizations.role as pivot_role')

    return results as Array<Organization & { pivot_role: string }>
  }

  /**
   * Compter le nombre d'organisations d'un utilisateur
   */
  async countUserOrganizations(userId: string | number): Promise<number> {
    const { isTestEnvironment } = await import('#shared/container/container')

    // Skip cache in test environment to avoid stale data with database transactions
    if (!isTestEnvironment()) {
      const cacheKey = this.buildCacheKey(String(userId), 'user_org_count')
      const cached = await this.cache.get<number>(cacheKey)
      if (cached !== null) return cached
    }

    const { default: db } = await import('@adonisjs/lucid/services/db')

    const result = await db
      .from('user_organizations')
      .where('user_id', userId)
      .count('* as total')
      .first()

    const count = Number(result?.total || 0)

    // Only cache in non-test environments
    if (!isTestEnvironment()) {
      const cacheKey = this.buildCacheKey(String(userId), 'user_org_count')
      await this.cache.set(cacheKey, count, { ttl: 300, tags: ['user_organizations'] })
    }

    return count
  }

  /**
   * Ajouter un utilisateur à une organisation
   */
  async addUser(
    organizationId: string | number,
    userId: string | number,
    role: string
  ): Promise<void> {
    const org = await this.findByIdOrFail(organizationId)

    await org.related('users').attach({
      [userId]: {
        role,
        joined_at: new Date(),
      },
    })

    // Invalider les caches
    await this.cache?.invalidateTags(['organizations', 'org_members', 'user_organizations'])
  }

  /**
   * Supprimer un utilisateur d'une organisation
   */
  async removeUser(organizationId: string | number, userId: string | number): Promise<void> {
    const org = await this.findByIdOrFail(organizationId)

    await org.related('users').detach([userId])

    // Invalider les caches
    await this.cache?.invalidateTags(['organizations', 'org_members', 'user_organizations'])
  }

  /**
   * Mettre à jour le rôle d'un utilisateur dans une organisation
   */
  async updateUserRole(
    organizationId: string | number,
    userId: string | number,
    role: string
  ): Promise<void> {
    const org = await this.findByIdOrFail(organizationId)

    await org.related('users').pivotQuery().where('user_id', userId).update({ role })

    // Invalider les caches
    await this.cache?.invalidateTags(['organizations', 'org_members'])
  }

  /**
   * Vérifier si un utilisateur est membre d'une organisation
   */
  async isUserMember(organizationId: string | number, userId: string | number): Promise<boolean> {
    const cacheKey = this.buildCacheKey(String(organizationId), 'member', userId)

    const cached = await this.cache.get<boolean>(cacheKey)
    if (cached !== null) return cached

    const org = await this.findByIdOrFail(organizationId)
    const membership = await org
      .related('users')
      .pivotQuery()
      .where('user_id', userId)
      .first()

    const isMember = !!membership

    // Cache pendant 5 minutes
    await this.cache.set(cacheKey, isMember, { ttl: 300, tags: ['org_members'] })

    return isMember
  }

  /**
   * Obtenir le rôle d'un utilisateur dans une organisation
   */
  async getUserRole(
    organizationId: string | number,
    userId: string | number
  ): Promise<string | null> {
    const org = await this.findByIdOrFail(organizationId)
    const membership = await org
      .related('users')
      .pivotQuery()
      .where('user_id', userId)
      .first()

    return membership?.role || null
  }

  async findPaginatedWithMemberCounts(
    page: number = 1,
    perPage: number = 20
  ): Promise<PaginatedOrganizations> {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const offset = (page - 1) * perPage

    const [orgs, totalRow, memberRows] = await Promise.all([
      this.buildBaseQuery()
        .orderBy('created_at', 'desc')
        .offset(offset)
        .limit(perPage),
      this.buildBaseQuery().count('* as total').first(),
      db
        .from('user_organizations')
        .select('organization_id')
        .count('* as members_count')
        .groupBy('organization_id'),
    ])

    const total = Number((totalRow as any)?.$extras?.total ?? (totalRow as any)?.total ?? 0)

    const membersCountMap = new Map<string, number>()
    for (const row of memberRows) {
      const r: any = row
      if (r.organization_id !== undefined) {
        membersCountMap.set(String(r.organization_id), Number(r.members_count))
      }
    }

    const data: OrganizationWithMemberCount[] = orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      descriptionI18n: org.descriptionI18n ?? null,
      website: org.website ?? null,
      isActive: Boolean(org.isActive),
      createdAt: org.createdAt.toISO()!,
      membersCount: membersCountMap.get(String(org.id)) ?? 0,
    }))

    return { data, meta: { total, perPage, currentPage: page } }
  }

  async getMembers(organizationId: string | number): Promise<OrganizationMember[]> {
    const org = await this.findByIdOrFail(organizationId)
    await org.load('users')

    return org.users.map((user) => {
      const extras: any = (user as any).$extras ?? {}
      const joinedAtRaw = extras.pivot_joined_at

      const joinedAt = joinedAtRaw instanceof Date
        ? joinedAtRaw.toISOString()
        : joinedAtRaw
        ? new Date(joinedAtRaw).toISOString()
        : ''

      return {
        id: user.id,
        fullName: user.fullName ?? null,
        email: user.email,
        avatarUrl: (user as any).avatarUrl ?? null,
        role: extras.pivot_role ?? '',
        joinedAt,
      }
    })
  }

  /**
   * Hook après création - invalider les caches slug
   */
  protected async afterCreate(org: Organization): Promise<void> {
    await super.afterCreate(org)
    await this.cache?.invalidateTags(['org_slug'])
  }

  /**
   * Hook après mise à jour - invalider les caches slug
   */
  protected async afterUpdate(org: Organization): Promise<void> {
    await super.afterUpdate(org)
    await this.cache?.invalidateTags(['org_slug'])
  }
}