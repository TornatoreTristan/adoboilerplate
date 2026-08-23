import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AuthorizationService from '#roles/services/authorization_service'
import { E } from '#shared/exceptions/index'

export type PermissionMiddlewareOptions = string[] | { permissions: string[]; requireAll?: boolean }

export default class PermissionMiddleware {
  constructor(
    protected permissions: string[] = [],
    protected requireAll: boolean = false
  ) {}

  /**
   * `options` is the third argument AdonisJS's router passes to named
   * middleware invoked with params — e.g.
   * `middleware.permission(['warehouse.manage'])` in a route group. The
   * router constructs this class with the container (zero-arg constructor),
   * so the permissions list travels through `options`, not the
   * constructor — the constructor overload only exists for direct
   * instantiation (see permission_middleware.spec.ts).
   */
  async handle(ctx: HttpContext, next: NextFn, options?: PermissionMiddlewareOptions) {
    const permissions = this.resolvePermissions(options)
    const requireAll = this.resolveRequireAll(options)

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

    // Garde-fou anti fail-open. `canAll([])` renvoie true (rien à vérifier,
    // donc tout est vérifié), si bien qu'une liste vide combinée à
    // requireAll accorderait l'accès à tout le monde. Une liste vide est
    // toujours une erreur de câblage, jamais une intention : on refuse.
    if (permissions.length === 0) {
      E.forbidden('accéder à cette ressource : aucune permission requise déclarée')
    }

    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)

    const hasAccess = requireAll
      ? await authService.canAll(userId, organizationId, permissions)
      : await authService.canAny(userId, organizationId, permissions)

    if (!hasAccess) {
      E.forbidden(`Permission requise: ${permissions.join(requireAll ? ' et ' : ' ou ')}`)
    }

    return next()
  }

  private resolvePermissions(options?: PermissionMiddlewareOptions): string[] {
    if (Array.isArray(options)) return options
    if (options?.permissions) return options.permissions
    return this.permissions
  }

  private resolveRequireAll(options?: PermissionMiddlewareOptions): boolean {
    if (Array.isArray(options)) return this.requireAll
    if (options?.requireAll !== undefined) return options.requireAll
    return this.requireAll
  }
}
