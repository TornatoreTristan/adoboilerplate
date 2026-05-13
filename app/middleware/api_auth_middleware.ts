import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type ApiTokenService from '#api/services/api_token_service'
import type UserRepository from '#users/repositories/user_repository'
import type OrganizationRepository from '#organizations/repositories/organization_repository'
import { E } from '#shared/exceptions/index'

export default class ApiAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const plainToken = this.extractBearerToken(ctx)
    if (!plainToken) {
      E.apiTokenInvalid('Token API manquant dans le header Authorization')
    }

    const apiTokenService = getService<ApiTokenService>(TYPES.ApiTokenService)
    const token = await apiTokenService.verify(plainToken)

    const userRepository = getService<UserRepository>(TYPES.UserRepository)
    const user = await userRepository.findById(token.userId, {
      cache: { ttl: 60, tags: [`user_${token.userId}`, 'users'] },
    })

    if (!user || (user.deleted_at && user.deleted_at.toMillis() <= Date.now())) {
      E.apiTokenInvalid('Utilisateur associé au token introuvable')
    }

    ctx.apiToken = token
    ctx.user = user

    if (token.organizationId) {
      const orgRepository = getService<OrganizationRepository>(TYPES.OrganizationRepository)
      const organization = await orgRepository.findById(token.organizationId, {
        cache: { ttl: 60, tags: [`organization_${token.organizationId}`] },
      })

      if (!organization) {
        E.apiTokenInvalid('Organisation associée au token introuvable')
      }

      ctx.organization = organization
    }

    apiTokenService.touchLastUsed(token.id).catch(() => {
      // Best-effort update; never block the request on telemetry.
    })

    return next()
  }

  private extractBearerToken(ctx: HttpContext): string | null {
    const header = ctx.request.header('authorization')
    if (!header) return null

    const match = header.match(/^Bearer\s+(.+)$/i)
    if (!match) return null

    const token = match[1].trim()
    return token.length > 0 ? token : null
  }
}
