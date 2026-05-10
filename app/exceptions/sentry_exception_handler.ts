import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type SentryService from '#monitoring/services/sentry_service'

export default class SentryExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = process.env.NODE_ENV !== 'production'

  /**
   * The method is used for reporting exception to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    // Si en dev, on skip Sentry (utilise juste les logs)
    if (this.debug) {
      return super.report(error, ctx)
    }

    try {
      const sentryService = getService<SentryService>(TYPES.SentryService)

      if (!sentryService.isInitialized()) {
        return super.report(error, ctx)
      }

      // Capture le contexte HTTP
      sentryService.captureHttpContext(ctx)

      // Capture l'exception
      if (error instanceof Error) {
        sentryService.captureException(error, {
          route: ctx.route?.pattern,
          controller: ctx.route?.meta?.resolvedHandler,
        })
      }
    } catch (sentryError) {
      // Si Sentry échoue, on ne veut pas crasher l'app
      console.error('[Sentry] Failed to report error:', sentryError)
    }

    return super.report(error, ctx)
  }

  /**
   * The method is used to render the exception to a HTTP response.
   * v7 renamed ExceptionHandler.render → ExceptionHandler.handle.
   */
  async handle(error: unknown, ctx: HttpContext) {
    return super.handle(error, ctx)
  }
}
