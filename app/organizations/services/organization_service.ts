import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import OrganizationRepository from '#organizations/repositories/organization_repository'
import type {
  CreateOrganizationData,
  OrganizationData,
  OrganizationRole,
} from '#shared/types/organization'

interface CreateOrganizationDataWithEn extends CreateOrganizationData {
  descriptionEn?: string
}

@injectable()
export default class OrganizationService {
  constructor(
    @inject(TYPES.OrganizationRepository) private organizationRepo: OrganizationRepository
  ) {}

  /**
   * Create the organization, default the slug to the row id when none is
   * provided, and attach the calling user as owner — the repository handles
   * the transaction so a partial failure doesn't leave a half-created tenant.
   */
  async create(
    organizationData: CreateOrganizationData,
    ownerUserId: string
  ): Promise<OrganizationData> {
    const data = organizationData as CreateOrganizationDataWithEn
    const organization = await this.organizationRepo.createWithOwner(
      {
        name: organizationData.name,
        slug: organizationData.slug,
        descriptionI18n: organizationData.description
          ? {
              fr: organizationData.description,
              en: data.descriptionEn || organizationData.description,
            }
          : null,
        website: organizationData.website || null,
        isActive: true,
      },
      ownerUserId
    )

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

    type UserWithPivot = (typeof organization.users)[number] & {
      $extras: { pivot_role: string; pivot_joined_at: string | Date }
    }

    return (organization.users as unknown as UserWithPivot[]).map((user) => ({
      id: user.id,
      email: user.email,
      role: user.$extras.pivot_role,
      joinedAt: user.$extras.pivot_joined_at,
    }))
  }
}
