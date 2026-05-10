import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type OrganizationService from '#organizations/services/organization_service'
import type OrganizationRepository from '#organizations/repositories/organization_repository'
import { createOrganizationValidator } from '#organizations/validators/create_organization_validator'
import { E } from '#shared/exceptions/index'

export default class OrganizationsController {
  async store({ request, response, session, user }: HttpContext) {
    // Ensure user is authenticated
    E.assertUserExists(user)

    // Validate data
    const data = await request.validateUsing(createOrganizationValidator)

    // Get service
    const orgService = getService<OrganizationService>(TYPES.OrganizationService)

    // Create organization with user as owner
    const organization = await orgService.create(data, user.id)

    // Set as current organization in session
    session.put('current_organization_id', organization.id)

    // Redirect to home page (onboarding can be added later)
    return response.redirect('/')
  }

  async index({ response, user }: HttpContext) {
    // Ensure user is authenticated
    E.assertUserExists(user)

    // Get repository
    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    // Get user's organizations
    const organizations = await orgRepo.findByUserId(user.id)

    return response.json({
      success: true,
      data: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        role: org.pivot_role,
      })),
    })
  }

  async switch({ request, response, session, user }: HttpContext) {
    // Ensure user is authenticated
    E.assertUserExists(user)

    const organizationId = request.param('id')

    // Get repository
    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    // Verify user is member of this organization
    const isMember = await orgRepo.isUserMember(organizationId, user.id)

    if (!isMember) {
      E.forbidden("Vous n'êtes pas membre de cette organisation")
    }

    // Update session with new current organization
    session.put('current_organization_id', organizationId)

    return response.json({
      success: true,
      message: 'Organisation changée avec succès',
    })
  }
}
