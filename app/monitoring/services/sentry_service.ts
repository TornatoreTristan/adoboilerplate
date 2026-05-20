import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import { injectable } from 'inversify'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'

export interface SentryConfig {
  dsn: string
  environment: string
  release?: string
  tracesSampleRate?: number
  profilesSampleRate?: number
  enabled?: boolean
}

@injectable()
export default class SentryService {
  private initialized = false

  /**
   * Initialize Sentry with configuration
   */
  init(config: SentryConfig): void {
    if (this.initialized) {
      return
    }

    // Ne pas initialiser si désactivé ou pas de DSN
    if (!config.enabled || !config.dsn) {
      logger.info('[Sentry] Disabled - No DSN provided or explicitly disabled')
      return
    }

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,

      // Performance Monitoring
      tracesSampleRate: config.tracesSampleRate ?? 0.1, // 10% des transactions en prod

      // Profiling
      profilesSampleRate: config.profilesSampleRate ?? 0.1, // 10% profiling
      integrations: [nodeProfilingIntegration()],

      // Ne pas envoyer les données sensibles
      beforeSend(event, _hint) {
        // Filtrer les erreurs de validation (pas critique)
        if (event.exception?.values?.[0]?.type === 'ValidationException') {
          return null
        }

        // Filtrer les 404 (pas des erreurs à tracker)
        if (event.exception?.values?.[0]?.type === 'E_ROUTE_NOT_FOUND') {
          return null
        }

        // Supprimer les données sensibles des contextes
        if (event.request?.cookies) {
          delete event.request.cookies
        }

        if (event.request?.headers) {
          delete event.request.headers['authorization']
          delete event.request.headers['cookie']
        }

        return event
      },
    })

    this.initialized = true
    logger.info(`[Sentry] Initialized for environment: ${config.environment}`)
  }

  /**
   * Capture une exception avec contexte
   */
  captureException(error: Error, context?: Record<string, unknown>): string {
    if (!this.initialized) {
      return ''
    }

    return Sentry.captureException(error, {
      contexts: context
        ? {
            custom: context,
          }
        : undefined,
    })
  }

  /**
   * Capture un message (pour logs importants)
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): string {
    if (!this.initialized) {
      return ''
    }

    return Sentry.captureMessage(message, level)
  }

  /**
   * Set user context pour tracer les erreurs par utilisateur
   */
  setUser(user: { id: string; email: string; username?: string } | null): void {
    if (!this.initialized) {
      return
    }

    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
      })
    } else {
      Sentry.setUser(null)
    }
  }

  /**
   * Add breadcrumb (actions utilisateur avant l'erreur)
   */
  addBreadcrumb(breadcrumb: {
    message: string
    category?: string
    level?: Sentry.SeverityLevel
    data?: Record<string, unknown>
  }): void {
    if (!this.initialized) {
      return
    }

    Sentry.addBreadcrumb(breadcrumb)
  }

  /**
   * Set tags pour filtrer les erreurs
   */
  setTag(key: string, value: string): void {
    if (!this.initialized) {
      return
    }

    Sentry.setTag(key, value)
  }

  /**
   * Set contexte custom
   */
  setContext(name: string, context: Record<string, unknown>): void {
    if (!this.initialized) {
      return
    }

    Sentry.setContext(name, context)
  }

  /**
   * Capture contexte HTTP request
   */
  captureHttpContext(ctx: HttpContext): void {
    if (!this.initialized) {
      return
    }

    // Set user si authentifié
    if (ctx.auth.user) {
      this.setUser({
        id: ctx.auth.user.id,
        email: ctx.auth.user.email,
        username: ctx.auth.user.fullName || undefined,
      })
    }

    // Set request context
    this.setContext('http', {
      method: ctx.request.method(),
      url: ctx.request.url(true),
      query: ctx.request.qs(),
      ip: ctx.request.ip(),
      userAgent: ctx.request.header('user-agent'),
    })

    // Add breadcrumb pour la requête
    this.addBreadcrumb({
      category: 'http',
      message: `${ctx.request.method()} ${ctx.request.url()}`,
      level: 'info',
      data: {
        method: ctx.request.method(),
        url: ctx.request.url(),
        statusCode: ctx.response.getStatus(),
      },
    })
  }

  /**
   * Flush events (avant shutdown)
   */
  async close(timeout: number = 2000): Promise<boolean> {
    if (!this.initialized) {
      return true
    }

    return Sentry.close(timeout)
  }

  /**
   * Vérifie si Sentry est initialisé
   */
  isInitialized(): boolean {
    return this.initialized
  }
}
