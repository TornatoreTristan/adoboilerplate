import { injectable } from 'inversify'
import { DateTime } from 'luxon'
import { BaseRepository } from '#shared/repositories/base_repository'
import ApiToken from '#api/models/api_token'

@injectable()
export default class ApiTokenRepository extends BaseRepository<typeof ApiToken> {
  protected model = ApiToken

  async findByHash(tokenHash: string): Promise<ApiToken | null> {
    return this.findOneBy({ token_hash: tokenHash })
  }

  async findActiveByHash(tokenHash: string): Promise<ApiToken | null> {
    const token = await this.findByHash(tokenHash)
    if (!token) return null
    if (!token.isActive) return null
    return token
  }

  async listForUser(userId: string): Promise<ApiToken[]> {
    return this.buildBaseQuery().where('user_id', userId).orderBy('created_at', 'desc')
  }

  async listForOrganization(organizationId: string): Promise<ApiToken[]> {
    return this.buildBaseQuery()
      .where('organization_id', organizationId)
      .orderBy('created_at', 'desc')
  }

  async revoke(id: string): Promise<ApiToken> {
    return this.update(id, { revokedAt: DateTime.now() })
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.model.query().where('id', id).update({ last_used_at: DateTime.now().toSQL() })
  }
}
