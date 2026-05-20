import { injectable } from 'inversify'
import { BaseRepository } from '#shared/repositories/base_repository'
import Integration from '#integrations/models/integration'

@injectable()
export default class IntegrationRepository extends BaseRepository<typeof Integration> {
  protected model = Integration

  async findByProvider(provider: string): Promise<Integration | null> {
    return this.findOneBy({ provider })
  }

  async upsertIntegration(
    provider: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- config shape varies per integration provider
    config: Record<string, any>,
    isActive: boolean,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- metadata shape varies per integration provider
    metadata?: Record<string, any>
  ): Promise<Integration> {
    const existing = await this.findByProvider(provider)

    if (existing) {
      return this.update(existing.id, {
        config,
        isActive,
        metadata: metadata || existing.metadata,
      })
    }

    return this.create({
      provider,
      config,
      isActive,
      metadata: metadata || null,
    })
  }
}
