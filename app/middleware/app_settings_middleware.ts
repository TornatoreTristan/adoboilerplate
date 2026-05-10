import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import logger from '@adonisjs/core/services/logger'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AppSettingsService from '#app_settings/services/app_settings_service'

export default class AppSettingsMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    try {
      const appSettingsService = getService<AppSettingsService>(TYPES.AppSettingsService)
      const settings = await appSettingsService.getSettings()

      ctx.view.share({
        appSettings: {
          appName: settings.appName,
          faviconUrl: settings.favicon?.url || null,
        },
      })
    } catch (error) {
      logger.error({ err: error }, 'AppSettings middleware error')
      ctx.view.share({
        appSettings: {
          appName: 'My Application',
          faviconUrl: null,
        },
      })
    }

    return next()
  }
}
