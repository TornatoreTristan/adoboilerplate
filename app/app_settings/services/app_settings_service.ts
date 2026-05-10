import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import AppSettingsRepository, {
  type UpdateAppSettingsData,
} from '#app_settings/repositories/app_settings_repository'
import type AppSettings from '#app_settings/models/app_settings'

@injectable()
export default class AppSettingsService {
  constructor(
    @inject(TYPES.AppSettingsRepository) private appSettingsRepo: AppSettingsRepository
  ) {}

  async getSettings(): Promise<AppSettings> {
    return this.appSettingsRepo.getSettings()
  }

  async updateSettings(data: UpdateAppSettingsData): Promise<AppSettings> {
    return this.appSettingsRepo.updateSettings(data)
  }

  async updateBranding(
    appName?: string,
    logoId?: string | null,
    faviconId?: string | null
  ): Promise<AppSettings> {
    const data: UpdateAppSettingsData = {}

    if (appName !== undefined) data.appName = appName
    if (logoId !== undefined) data.logoId = logoId
    if (faviconId !== undefined) data.faviconId = faviconId

    return this.appSettingsRepo.updateSettings(data)
  }

  async updateLegalDocuments(
    termsOfService?: string | null,
    termsOfSale?: string | null,
    privacyPolicy?: string | null
  ): Promise<AppSettings> {
    return this.appSettingsRepo.updateSettings({
      termsOfService,
      termsOfSale,
      privacyPolicy,
    })
  }
}
