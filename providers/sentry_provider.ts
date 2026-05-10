import type { ApplicationService } from '@adonisjs/core/types'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import env from '#start/env'
import type SentryService from '#monitoring/services/sentry_service'

export default class SentryProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {}

  /**
   * The container bindings have booted
   */
  async boot() {}

  /**
   * The application has been booted
   */
  async start() {
    const sentryService = getService<SentryService>(TYPES.SentryService)

    // Initialize Sentry with env config
    sentryService.init({
      dsn: env.get('SENTRY_DSN') || '',
      environment: env.get('SENTRY_ENVIRONMENT') || env.get('NODE_ENV') || 'development',
      release: process.env.npm_package_version || 'unknown',
      enabled: env.get('SENTRY_ENABLED') === 'true',
      tracesSampleRate: parseFloat(env.get('SENTRY_TRACES_SAMPLE_RATE') || '0.1'),
      profilesSampleRate: parseFloat(env.get('SENTRY_PROFILES_SAMPLE_RATE') || '0.1'),
    })
  }

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {
    const sentryService = getService<SentryService>(TYPES.SentryService)

    // Flush remaining events before shutdown
    await sentryService.close(2000)
  }
}
