import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type OrganizationInvitationRepository from '#organizations/repositories/organization_invitation_repository'
import type OrganizationRepository from '#organizations/repositories/organization_repository'

export default class OrganizationInvitationsController {
  async accept({ params, response, session, auth }: HttpContext) {
    const { token } = params

    const invitationRepo = getService<OrganizationInvitationRepository>(
      TYPES.OrganizationInvitationRepository
    )
    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    const invitation = await invitationRepo.findByToken(token)

    if (!invitation) {
      session.flash('error', 'Invitation introuvable ou invalide')
      return response.redirect('/')
    }

    if (invitation.isExpired) {
      session.flash('error', 'Cette invitation a expiré')
      return response.redirect('/')
    }

    if (invitation.isAccepted) {
      session.flash('error', 'Cette invitation a déjà été acceptée')
      return response.redirect('/')
    }

    const user = auth.user

    if (!user) {
      session.put('invitation_token', token)
      session.flash('info', 'Veuillez vous connecter ou créer un compte pour accepter l\'invitation')
      return response.redirect(`/auth/login?email=${encodeURIComponent(invitation.email)}`)
    }

    if (user.email !== invitation.email) {
      session.flash(
        'error',
        `Cette invitation est destinée à ${invitation.email}. Vous êtes connecté en tant que ${user.email}`
      )
      return response.redirect('/')
    }

    const isAlreadyMember = await orgRepo.isUserMember(invitation.organizationId, user.id)

    if (isAlreadyMember) {
      session.flash('error', 'Vous êtes déjà membre de cette organisation')
      return response.redirect('/')
    }

    await orgRepo.addUser(invitation.organizationId, user.id, invitation.role)

    await invitationRepo.markAsAccepted(invitation.id)

    await invitation.load('organization')
    const organizationName = invitation.organization.name

    session.flash('success', `Vous avez rejoint l'organisation ${organizationName} avec succès !`)

    return response.redirect('/')
  }

  async handlePostAuth({ session, response }: HttpContext) {
    const invitationToken = session.get('invitation_token')

    if (!invitationToken) {
      return response.redirect('/')
    }

    session.forget('invitation_token')

    return response.redirect(`/organizations/invitations/${invitationToken}/accept`)
  }
}
