import { injectable, inject } from 'inversify'
import { DateTime } from 'luxon'
import { TYPES } from '#shared/container/types'
import { BaseRepository } from '#shared/repositories/base_repository'
import EmailVerificationToken from '#auth/models/email_verification_token'
import CacheService from '#shared/services/cache_service'
import EventBusService from '#shared/services/event_bus_service'
import type { VerificationType } from '#auth/types/email_verification'

@injectable()
export default class EmailVerificationRepository extends BaseRepository<
  typeof EmailVerificationToken
> {
  protected model = EmailVerificationToken

  constructor(
    @inject(TYPES.CacheService) cacheService: CacheService,
    @inject(TYPES.EventBus) eventBus: EventBusService
  ) {
    super(cacheService, eventBus)
  }

  async findByToken(token: string): Promise<EmailVerificationToken | null> {
    return this.findOneBy({ token })
  }

  async findValidToken(
    userId: string,
    type: VerificationType
  ): Promise<EmailVerificationToken | null> {
    const query = this.buildBaseQuery()
      .where('user_id', userId)
      .where('type', type)
      .where('expires_at', '>', DateTime.now().toSQL()!)
      .whereNull('verified_at')

    const result = await query.first()
    return result
  }

  async markAsVerified(tokenId: string): Promise<void> {
    await this.update(tokenId, {
      verifiedAt: DateTime.now(),
    })
  }

  async deleteByUserAndType(userId: string, type: VerificationType): Promise<number> {
    // Lucid's delete() returns the underlying knex result (number on Postgres,
    // [number] on some adapters). Normalise to a plain number.
    const result = (await this.model
      .query()
      .where('user_id', userId)
      .where('type', type)
      .delete()) as unknown as number | [number]

    return Array.isArray(result) ? result[0] : result
  }
}
