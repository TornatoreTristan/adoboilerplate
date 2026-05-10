import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type Organization from '#organizations/models/organization'
import { E } from '#shared/exceptions/index'

export default class OrganizationContextMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { session } = ctx

    // Récupérer l'user depuis le contexte (mis par auth middleware)
    const user = ctx.user
    E.assertUserExists(user)

    // Charger les organisations de l'user
    await user.load('organizations')

    // Si l'user n'a aucune organisation, lever une exception
    if (user.organizations.length === 0) {
      E.userNotMember('aucune organisation')
    }

    // Récupérer l'org en session
    const currentOrgId = session.get('current_organization_id')

    let organization: Organization | undefined

    // Si org en session, vérifier que l'user en est membre
    if (currentOrgId) {
      organization = user.organizations.find((org) => org.id === currentOrgId)
    }

    // Si pas d'org valide, prendre la première
    if (!organization) {
      organization = user.organizations[0]
      session.put('current_organization_id', organization.id)
    }

    // Injecter dans le contexte HTTP
    ctx.organization = organization

    await next()
  }
}
