import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import { BaseRepository } from '#shared/repositories/base_repository'
import Upload from '#uploads/models/upload'
import CacheService from '#shared/services/cache_service'
import EventBusService from '#shared/services/event_bus_service'
import type { UploadFilters } from '#uploads/types/upload'

@injectable()
export default class UploadRepository extends BaseRepository<typeof Upload> {
  protected model = Upload

  constructor(
    @inject(TYPES.CacheService) cacheService: CacheService,
    @inject(TYPES.EventBus) eventBus: EventBusService
  ) {
    super(cacheService, eventBus)
  }

  async findByUserId(userId: string): Promise<Upload[]> {
    return this.findBy({ userId })
  }

  async findBy(filters: UploadFilters): Promise<Upload[]> {
    const query = this.buildBaseQuery()

    if (filters.userId) {
      query.where('user_id', filters.userId)
    }

    if (filters.disk) {
      query.where('disk', filters.disk)
    }

    if (filters.visibility) {
      query.where('visibility', filters.visibility)
    }

    if (filters.uploadableType) {
      query.where('uploadable_type', filters.uploadableType)
    }

    if (filters.uploadableId) {
      query.where('uploadable_id', filters.uploadableId)
    }

    return query
  }
}
