import { injectable } from 'inversify'
import OrganizationInvitation from '#organizations/models/organization_invitation'
import { BaseRepository } from '#shared/repositories/base_repository'
import { DateTime } from 'luxon'

@injectable()
export default class OrganizationInvitationRepository extends BaseRepository<
  typeof OrganizationInvitation
> {
  protected model = OrganizationInvitation

  async findByToken(token: string): Promise<OrganizationInvitation | null> {
    return this.findOneBy({ token }, {
      cache: { ttl: 60, tags: ['invitations'] }
    })
  }

  async findPendingByOrganization(organizationId: string): Promise<OrganizationInvitation[]> {
    const query = this.buildBaseQuery()

    return query
      .where('organization_id', organizationId)
      .whereNull('accepted_at')
      .where('expires_at', '>', DateTime.now().toSQL())
      .orderBy('created_at', 'desc')
  }

  async findPendingByEmail(
    email: string,
    organizationId: string
  ): Promise<OrganizationInvitation | null> {
    return this.findOneBy({
      email,
      organizationId,
      acceptedAt: null,
    })
  }

  async markAsAccepted(id: string): Promise<OrganizationInvitation> {
    await this.findByIdOrFail(id)

    return this.update(
      id,
      { acceptedAt: DateTime.now() } as any,
      {
        cache: { tags: ['invitations', `invitation_${id}`] },
      }
    )
  }

  async deleteExpired(): Promise<number> {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const nowSql = DateTime.now().toSQL() ?? DateTime.now().toISO()!

    const result = (await db
      .from('organization_invitations')
      .where('expires_at', '<', nowSql)
      .whereNull('accepted_at')
      .delete()) as unknown as number | [number]

    await this.cache?.invalidateTags(['invitations'])

    return Array.isArray(result) ? result[0] : result
  }

  async invitationExists(email: string, organizationId: string): Promise<boolean> {
    const invitation = await this.findPendingByEmail(email, organizationId)
    return invitation !== null && !invitation.isExpired
  }

  protected async afterCreate(invitation: OrganizationInvitation): Promise<void> {
    await super.afterCreate(invitation)
    await this.cache?.invalidateTags(['invitations'])
  }

  protected async afterUpdate(invitation: OrganizationInvitation): Promise<void> {
    await super.afterUpdate(invitation)
    await this.cache?.invalidateTags(['invitations', `invitation_${invitation.id}`])
  }
}
