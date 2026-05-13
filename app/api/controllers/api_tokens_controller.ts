import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type ApiTokenService from '#api/services/api_token_service'
import type ApiTokenRepository from '#api/repositories/api_token_repository'
import { createApiTokenValidator } from '#api/validators/api_token_validator'
import { ALL_API_SCOPES } from '#api/constants/api_scopes'
import { E } from '#shared/exceptions/index'

export default class ApiTokensController {
  async page({ inertia, user, organization }: HttpContext) {
    E.assertUserExists(user)

    const repo = getService<ApiTokenRepository>(TYPES.ApiTokenRepository)
    const tokens = await repo.listForUser(user.id)

    return inertia.render('account/api-tokens', {
      tokens: tokens.map((token) => ({
        id: token.id,
        name: token.name,
        prefix: token.prefix,
        scopes: token.scopes,
        expiresAt: token.expiresAt?.toISO() ?? null,
        lastUsedAt: token.lastUsedAt?.toISO() ?? null,
        revokedAt: token.revokedAt?.toISO() ?? null,
        createdAt: token.createdAt.toISO(),
      })),
      availableScopes: ALL_API_SCOPES,
      currentOrganizationId: organization?.id ?? null,
    })
  }

  async store({ request, response, user, organization }: HttpContext) {
    E.assertUserExists(user)

    const data = await request.validateUsing(createApiTokenValidator)

    const service = getService<ApiTokenService>(TYPES.ApiTokenService)
    const generated = await service.generate({
      userId: user.id,
      organizationId: organization?.id ?? null,
      name: data.name,
      scopes: data.scopes,
      expiresAt: data.expiresAt ?? null,
    })

    return response.created({
      token: {
        id: generated.id,
        name: generated.name,
        prefix: generated.prefix,
        scopes: generated.scopes,
        expiresAt: generated.expiresAt?.toISOString() ?? null,
        createdAt: generated.createdAt.toISOString(),
        plainToken: generated.plainToken,
      },
    })
  }

  async destroy({ params, response, user }: HttpContext) {
    E.assertUserExists(user)

    const service = getService<ApiTokenService>(TYPES.ApiTokenService)
    await service.revoke(params.id, user.id)

    return response.json({ success: true })
  }
}
