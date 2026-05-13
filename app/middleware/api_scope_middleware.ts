import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { ApiScope } from '#api/constants/api_scopes'
import { E } from '#shared/exceptions/index'

export default class ApiScopeMiddleware {
  async handle(ctx: HttpContext, next: NextFn, requiredScopes: ApiScope[]) {
    const token = ctx.apiToken
    if (!token) {
      E.apiTokenInvalid('Token API requis avant la vérification de scope')
    }

    const missing = requiredScopes.filter((scope) => !token.hasScope(scope))
    if (missing.length > 0) {
      E.insufficientScope(missing)
    }

    return next()
  }
}
