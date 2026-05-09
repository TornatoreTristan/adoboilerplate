import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import OrganizationRepository from '#organizations/repositories/organization_repository'

export default class RequireOrganizationMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    // Skip check if on organization creation route
    const url = ctx.request.url()
    if (url === '/organizations/create' || url.startsWith('/organizations/create?')) {
      return next()
    }

    // Assume user is already authenticated (this middleware runs after auth)
    if (!ctx.user) {
      return next()
    }

    // Check if user has any organizations
    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const orgCount = await orgRepo.countUserOrganizations(ctx.user.id)

    if (orgCount === 0) {
      // User has no organizations, redirect to creation page
      // Handle Inertia requests
      if (ctx.request.header('x-inertia')) {
        ctx.response.header('X-Inertia-Location', '/organizations/create')
        return ctx.response.status(409).send('')
      }

      return ctx.response.redirect('/organizations/create')
    }

    // User has at least one organization, continue
    return next()
  }
}
