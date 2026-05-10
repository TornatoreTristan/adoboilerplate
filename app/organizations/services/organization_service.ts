import { injectable, inject } from 'inversify'
import db from '@adonisjs/lucid/services/db'
import { TYPES } from '#shared/container/types'
import OrganizationRepository from '#organizations/repositories/organization_repository'
import Organization from '#organizations/models/organization'
import type CacheService from '#shared/services/cache_service'
import type {
  CreateOrganizationData,
  OrganizationData,
  OrganizationRole,
} from '#shared/types/organization'

@injectable()
export default class OrganizationService {
  constructor(
    @inject(TYPES.OrganizationRepository) private organizationRepo: OrganizationRepository,
    @inject(TYPES.CacheService) private cache: CacheService
  ) {}

  /**
   * Create the organization, default the slug to the row id when none is
   * provided, and attach the calling user as owner — all inside a single DB
   * transaction so a partial failure (e.g. owner attach blowing up after the
   * org row is committed) doesn't leave a half-created tenant behind.
   */
  async create(
    organizationData: CreateOrganizationData,
    ownerUserId: string
  ): Promise<OrganizationData> {
    const organization = await db.transaction(async (trx) => {
      const org = await Organization.create(
        {
          name: organizationData.name,
          slug: organizationData.slug || '',
          descriptionI18n: organizationData.description
            ? {
                fr: organizationData.description,
                en: (organizationData as any).descriptionEn || organizationData.description,
              }
            : null,
          website: organizationData.website || null,
          isActive: true,
        },
        { client: trx }
      )

      if (!organizationData.slug) {
        org.slug = org.id
        await org.save()
      }

      await org.related('users').attach(
        {
          [ownerUserId]: {
            role: 'owner',
            joined_at: new Date(),
          },
        },
        trx
      )

      return org
    })

    // Cache invalidation runs after commit so we don't poison the cache with a
    // tenant that ended up rolling back.
    await this.cache.invalidateTags([
      'organizations',
      'user_organizations',
      'org_slug',
      'org_members',
    ])

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      description: organization.descriptionI18n?.fr || organization.descriptionI18n?.en || null,
      website: organization.website,
      isActive: organization.isActive,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    }
  }

  async addUser(organizationId: string, userId: string, role: OrganizationRole): Promise<void> {
    await this.organizationRepo.addUser(organizationId, userId, role)
  }

  async getUsers(organizationId: string) {
    const organization = await this.organizationRepo.findByIdOrFail(organizationId)

    // Charger la relation users avec les colonnes pivot
    await organization.load('users', (query) => {
      query.pivotColumns(['role', 'joined_at'])
    })

    return organization.users.map((user) => ({
      id: user.id,
      email: user.email,
      role: (user as any).$extras.pivot_role,
      joinedAt: (user as any).$extras.pivot_joined_at,
    }))
  }
}
