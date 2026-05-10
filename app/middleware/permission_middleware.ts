import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AuthorizationService from '#roles/services/authorization_service'
import { E } from '#shared/exceptions/index'

export default class PermissionMiddleware {
  constructor(
    protected permissions: string[],
    protected requireAll: boolean = false
  ) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const userId = ctx.session.get('user_id')
    // Always source the organization from the trusted context populated by
    // OrganizationContextMiddleware — never from user-controlled inputs like
    // request.input('organization_id'), which would let a member of org A
    // claim a role check against org B.
    const organizationId = ctx.organization?.id

    if (!userId) {
      E.unauthorized('Non authentifié')
    }

    if (!organizationId) {
      E.forbidden("accéder à cette ressource sans contexte d'organisation")
    }

    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)

    const hasAccess = this.requireAll
      ? await authService.canAll(userId, organizationId, this.permissions)
      : await authService.canAny(userId, organizationId, this.permissions)

    if (!hasAccess) {
      E.forbidden(`Permission requise: ${this.permissions.join(this.requireAll ? ' et ' : ' ou ')}`)
    }

    return next()
  }
}
