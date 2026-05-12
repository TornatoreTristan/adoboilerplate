import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import { BaseRepository } from '#shared/repositories/base_repository'
import AppSettings from '#app_settings/models/app_settings'
import CacheService from '#shared/services/cache_service'
import EventBusService from '#shared/services/event_bus_service'
import { E } from '#shared/exceptions/exception_helpers'

export interface UpdateAppSettingsData {
  appName?: string
  logoId?: string | null
  faviconId?: string | null
  termsOfService?: string | null
  termsOfSale?: string | null
  privacyPolicy?: string | null
}

@injectable()
export default class AppSettingsRepository extends BaseRepository<typeof AppSettings> {
  protected model = AppSettings

  constructor(
    @inject(TYPES.CacheService) cacheService: CacheService,
    @inject(TYPES.EventBus) eventBus: EventBusService
  ) {
    super(cacheService, eventBus)
  }

  /**
   * Get the singleton app settings instance
   * Note: We don't cache this because Lucid relations don't serialize well to Redis.
   * Since it's a single row, the performance impact is minimal.
   */
  async getSettings(): Promise<AppSettings> {
    // Always fetch fresh from DB to ensure relations are loaded
    const settings = await this.model.query().preload('logo').preload('favicon').first()

    if (!settings) {
      E.internal('App settings not found. Run migrations to initialize.')
    }

    return settings
  }

  /**
   * Update the singleton app settings instance
   */
  async updateSettings(data: UpdateAppSettingsData): Promise<AppSettings> {
    const settings = await this.getSettings()

    // Update
    await this.model.query().where('id', settings.id).update(data)

    // Fetch updated with fresh query and relations
    const updated = await this.model.query().preload('logo').preload('favicon').first()

    if (!updated) {
      E.internal('App settings not found after update')
    }

    return updated
  }
}
