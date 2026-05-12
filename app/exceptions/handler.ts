import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'
import { AppException } from '#shared/exceptions/app_exception'
import {
  InternalServerException,
  UserEmailAlreadyExistsException,
} from '#shared/exceptions/domain_exceptions'
import { ERROR_CODES } from '#shared/constants/error_codes'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type SentryService from '#monitoring/services/sentry_service'

function serializeHttpError(error: { message?: string; status?: number; code?: string }): {
  message: string
  status: number
  code?: string
} {
  return {
    message: error.message ?? 'Une erreur est survenue',
    status: error.status ?? 500,
    code: error.code,
  }
}

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Status pages are used to display a custom HTML pages for certain error
   * codes. You might want to enable them in production only, but feel
   * free to enable them in development as well.
   */
  protected renderStatusPages = app.inProduction

  /**
   * Status pages is a collection of error code range and a callback
   * to return the HTML contents to send as a response.
   */
  protected statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    '404': (error, { inertia }) =>
      inertia.render('errors/not_found', { error: serializeHttpError(error) }),
    '500..599': (error, { inertia }) =>
      inertia.render('errors/server_error', { error: serializeHttpError(error) }),
  }

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    // Si c'est une de nos AppException, on la traite spécialement
    if (error instanceof AppException) {
      return this.handleAppException(error, ctx)
    }

    // Si c'est une erreur de validation VineJS
    if (this.isVineError(error)) {
      return this.handleVineError(error, ctx)
    }

    // Si c'est une erreur 404 d'AdonisJS
    if (this.isRouteNotFoundError(error)) {
      return this.handleNotFoundError(ctx)
    }

    // Pour toutes les autres erreurs, on les wrappe en InternalServerException
    const wrappedException = new InternalServerException(
      app.inProduction ? 'Une erreur interne est survenue' : (error as Error).message,
      this.debug
        ? { originalError: (error as Error).message, stack: (error as Error).stack }
        : undefined
    )

    return this.handleAppException(wrappedException, ctx)
  }

  /**
   * Gère les AppException personnalisées
   */
  private async handleAppException(error: AppException, ctx: HttpContext) {
    // Logger l'erreur si nécessaire
    if (error.shouldLog()) {
      this.logError(error, ctx)
    }

    // Cas spécial : email déjà utilisé → format validation Inertia attendu côté frontend
    if (error instanceof UserEmailAlreadyExistsException) {
      return ctx.response.status(error.status).json({
        errors: { email: error.message },
      })
    }

    // Pour les requêtes API (JSON), retourner du JSON
    if (this.isApiRequest(ctx)) {
      return ctx.response.status(error.status).json(error.toJSON())
    }

    // Pour les autres requêtes, utiliser le système de pages d'erreur par défaut
    return super.handle(error, ctx)
  }

  /**
   * Gère les erreurs de validation VineJS
   */
  private handleVineError(error: unknown, ctx: HttpContext) {
    const messages = (error as { messages?: Record<string, unknown> }).messages || {}
    const response = {
      success: false,
      error: {
        message: 'Erreurs de validation',
        code: ERROR_CODES.VALIDATION_ERROR,
        details: {
          fields: messages,
        },
      },
    }

    return ctx.response.status(422).json(response)
  }

  /**
   * Gère les erreurs 404
   */
  private handleNotFoundError(ctx: HttpContext) {
    const response = {
      success: false,
      error: {
        message: 'Route non trouvée',
        code: 'ROUTE_NOT_FOUND',
      },
    }

    return ctx.response.status(404).json(response)
  }

  /**
   * Détermine si c'est une requête API
   */
  private isApiRequest(ctx: HttpContext): boolean {
    return (
      ctx.request.header('accept')?.includes('application/json') ||
      ctx.request.url().startsWith('/api/') ||
      ctx.request.url().startsWith('/auth/') ||
      ctx.request.url().startsWith('/admin/') ||
      ctx.request.url() === '/admin' ||
      ctx.request.url().startsWith('/debug/')
    )
  }

  /**
   * Vérifie si c'est une erreur VineJS
   */
  private isVineError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'messages' in error &&
      typeof (error as { messages: unknown }).messages === 'object'
    )
  }

  /**
   * Vérifie si c'est une erreur 404 d'AdonisJS
   */
  private isRouteNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code === 'E_ROUTE_NOT_FOUND'
    )
  }

  /**
   * Log une erreur avec du contexte
   */
  private logError(error: AppException, ctx: HttpContext) {
    const logLevel = error.getLogLevel()
    const logData = {
      message: error.message,
      code: error.code,
      status: error.status,
      url: ctx.request.url(),
      method: ctx.request.method(),
      userAgent: ctx.request.header('user-agent'),
      ip: ctx.request.ip(),
      userId: ctx.user?.id,
      requestId: ctx.request.id(),
      stack: error.stack,
    }

    logger[logLevel]('Exception occurred', logData)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    // Report to Sentry in production
    if (app.inProduction) {
      try {
        const sentryService = getService<SentryService>(TYPES.SentryService)

        if (sentryService.isInitialized()) {
          // Capture HTTP context
          sentryService.captureHttpContext(ctx)

          // Skip reporting for certain errors
          const shouldSkip =
            this.isVineError(error) || // Validation errors
            this.isRouteNotFoundError(error) // 404 errors

          if (!shouldSkip && error instanceof Error) {
            sentryService.captureException(error, {
              route: ctx.route?.pattern,
              controller: ctx.route?.meta?.resolvedHandler,
              isAppException: error instanceof AppException,
              errorCode: error instanceof AppException ? error.code : undefined,
            })
          }
        }
      } catch (sentryError) {
        // If Sentry fails, don't crash the app
        logger.error('Failed to report error to Sentry', { error: sentryError })
      }
    }

    // Si c'est une AppException et qu'elle doit être loggée, on l'a déjà fait dans handle()
    if (error instanceof AppException && error.shouldLog()) {
      return
    }

    // Pour les autres erreurs, utiliser le comportement par défaut
    return super.report(error, ctx)
  }
}
