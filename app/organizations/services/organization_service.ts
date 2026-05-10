import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import OrganizationRepository from '#organizations/repositories/organization_repository'
import type {
  CreateOrganizationData,
  OrganizationData,
  OrganizationRole,
} from '#shared/types/organization'

@injectable()
export default class OrganizationService {
  constructor(
    @inject(TYPES.OrganizationRepository) private organizationRepo: OrganizationRepository
  ) {}

  async create(
    organizationData: CreateOrganizationData,
    ownerUserId: string
  ): Promise<OrganizationData> {
    // Créer l'organisation via repository
    const organization = await this.organizationRepo.create(
      {
        name: organizationData.name,
        slug: organizationData.slug || '', // Temporary, will be updated below
        descriptionI18n: organizationData.description
          ? {
              fr: organizationData.description,
              en: (organizationData as any).descriptionEn || organizationData.description,
            }
          : null,
        website: organizationData.website || null,
        isActive: true,
      },
      {
        cache: { tags: ['organizations', 'user_organizations'] },
      }
    )

    // Si pas de slug fourni, utiliser l'ID (UUID)
    if (!organizationData.slug) {
      await this.organizationRepo.update(
        organization.id,
        { slug: organization.id },
        {
          cache: { tags: ['organizations', 'org_slug'] },
        }
      )
      organization.slug = organization.id
    }

    // Attacher l'utilisateur comme owner via repository
    await this.organizationRepo.addUser(organization.id, ownerUserId, 'owner')

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
