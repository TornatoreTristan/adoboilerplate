import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type OrganizationRepository from '#organizations/repositories/organization_repository'
import type LocaleService from '#shared/services/locale_service'
import type AppSettingsService from '#app_settings/services/app_settings_service'

/**
 * Inertia middleware
 *
 * In v7, sharedData is no longer defined in config/inertia.ts. Instead, we
 * extend BaseInertiaMiddleware and override share(ctx) — that gives us the
 * full HttpContext (instead of a plain config callback) and lets us
 * surface validation errors via the inputErrorsBag flash key (renamed
 * from "errors" in v7).
 */
export default class InertiaMiddleware extends BaseInertiaMiddleware {
  async share(ctx: HttpContext) {
    return {
      auth: ctx.user
        ? {
            user: {
              id: ctx.user.id,
              fullName: ctx.user.fullName,
              email: ctx.user.email,
              avatarUrl: ctx.user.avatarUrl,
              googleId: ctx.user.googleId,
              isEmailVerified: ctx.user.isEmailVerified,
              isSuperAdmin: await ctx.user.isSuperAdmin(),
            },
          }
        : { user: null },

      // v7: never return `null` from a shared-data callback — the new
      // InertiaSerializer throws "Cannot serialize an item with null value".
      // Use { current: null, list: [] } as the empty shape instead.
      organizations: async () => {
        if (!ctx.user) {
          return { current: null, list: [] }
        }
        try {
          const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)
          const userOrganizations = await orgRepo.findByUserId(ctx.user.id)
          return {
            current: ctx.organization
              ? {
                  id: ctx.organization.id,
                  name: ctx.organization.name,
                  slug: ctx.organization.slug,
                  logoUrl: ctx.organization.logoUrl,
                  role: userOrganizations.find((org) => org.id === ctx.organization?.id)
                    ?.pivot_role,
                }
              : null,
            list: userOrganizations.map((org) => ({
              id: org.id,
              name: org.name,
              slug: org.slug,
              logoUrl: org.logoUrl,
              role: org.pivot_role,
            })),
          }
        } catch {
          return { current: null, list: [] }
        }
      },

      flash: {
        success: ctx.session.flashMessages.get('success'),
        error: ctx.session.flashMessages.get('error'),
        info: ctx.session.flashMessages.get('info'),
        warning: ctx.session.flashMessages.get('warning'),
      },

      // Validation errors — picks up flashErrors() / flashAll() under the
      // v7 inputErrorsBag key and exposes them as `errors` to the frontend
      errors: () => this.getValidationErrors(ctx),

      csrfToken: ctx.request.csrfToken,

      i18n: async () => {
        const localeService = getService<LocaleService>(TYPES.LocaleService)
        const locale = ctx.i18n?.locale || 'fr'
        const messages = await localeService.getMessages(locale)
        return { locale, messages }
      },

      appSettings: async () => {
        try {
          const appSettingsService = getService<AppSettingsService>(TYPES.AppSettingsService)
          const settings = await appSettingsService.getSettings()
          return {
            appName: settings.appName,
            faviconUrl: settings.favicon?.url ?? null,
          }
        } catch {
          return {
            appName: 'My Application',
            faviconUrl: null,
          }
        }
      },
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)
    try {
      return await next()
    } finally {
      this.dispose(ctx)
    }
  }
}
