import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type OrganizationRepository from '#organizations/repositories/organization_repository'
import { E } from '#shared/exceptions/index'
import { updateOrganizationValidator } from '#organizations/validators/update_organization_validator'
import { inviteMemberValidator } from '#organizations/validators/invite_member_validator'
import { updateMemberRoleValidator } from '#organizations/validators/update_member_role_validator'
import { removeMemberValidator } from '#organizations/validators/remove_member_validator'
import app from '@adonisjs/core/services/app'
import type UserRepository from '#users/repositories/user_repository'
import type OrganizationInvitationRepository from '#organizations/repositories/organization_invitation_repository'
import type SubscriptionRepository from '#billing/repositories/subscription_repository'
import type PlanRepository from '#billing/repositories/plan_repository'
import type SubscriptionService from '#billing/services/subscription_service'
import { DateTime } from 'luxon'
import { randomBytes, randomUUID } from 'node:crypto'

export default class OrganizationSettingsController {
  async index({ inertia, user, organization }: HttpContext) {
    E.assertUserExists(user)
    E.assertOrganizationExists(organization)

    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    const userRole = await orgRepo.getUserRole(organization.id, user.id)

    await organization.load('users', (query) => {
      query.pivotColumns(['role', 'joined_at'])
    })

    const members = organization.users.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      avatarUrl: member.avatarUrl,
      role: (member as any).$extras.pivot_role,
      joinedAt: (member as any).$extras.pivot_joined_at,
    }))

    return inertia.render('organizations/settings', {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        descriptionI18n: organization.descriptionI18n,
        website: organization.website,
        logoUrl: organization.logoUrl,
        email: organization.email,
        phone: organization.phone,
        siret: organization.siret,
        vatNumber: organization.vatNumber,
        address: organization.address,
        isActive: organization.isActive,
        createdAt: organization.createdAt.toISO(),
        updatedAt: organization.updatedAt.toISO(),
      },
      userRole,
      members,
    })
  }

  async update({ request, response, user, organization, session }: HttpContext) {
    E.assertUserExists(user)
    E.assertOrganizationExists(organization)

    const data = await request.validateUsing(updateOrganizationValidator)

    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    await orgRepo.update(
      organization.id,
      {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        siret: data.siret || null,
        vatNumber: data.vatNumber || null,
        address: data.address || null,
        website: data.website || null,
        descriptionI18n:
          data.description || (data as any).descriptionEn
            ? {
                fr: data.description || '',
                en: (data as any).descriptionEn || data.description || '',
              }
            : null,
      },
      {
        cache: { tags: ['organizations', `org_${organization.id}`] },
      }
    )

    session.flash('success', 'Organisation mise à jour avec succès')

    return response.redirect('/organizations/settings')
  }

  async integrations({ inertia }: HttpContext) {
    return inertia.render('organizations/settings-integrations', {})
  }

  async users({ inertia, user, organization }: HttpContext) {
    E.assertUserExists(user)
    E.assertOrganizationExists(organization)

    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const invitationRepo = getService<OrganizationInvitationRepository>(TYPES.OrganizationInvitationRepository)

    const userRole = await orgRepo.getUserRole(organization.id, user.id)

    await organization.load('users', (query) => {
      query.pivotColumns(['role', 'joined_at'])
    })

    const members = organization.users.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      avatarUrl: member.avatarUrl,
      role: (member as any).$extras.pivot_role,
      joinedAt: (member as any).$extras.pivot_joined_at,
    }))

    const pendingInvitations = await invitationRepo.findPendingByOrganization(organization.id)

    const invitations = pendingInvitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISO(),
      createdAt: invitation.createdAt.toISO(),
    }))

    return inertia.render('organizations/settings-users', {
      organization: {
        id: organization.id,
        name: organization.name,
      },
      userRole,
      members,
      invitations,
    })
  }

  async pricing({ inertia, user, organization }: HttpContext) {
    E.assertUserExists(user)
    E.assertOrganizationExists(organization)

    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const subscriptionRepo = getService<SubscriptionRepository>(TYPES.SubscriptionRepository)
    const planRepo = getService<PlanRepository>(TYPES.PlanRepository)

    const userRole = await orgRepo.getUserRole(organization.id, user.id)
    const currentSubscription = await subscriptionRepo.findActiveByOrganizationId(organization.id)
    const allPlans = await planRepo.findActiveAndVisible()

    return inertia.render('organizations/pricing', {
      organization: {
        id: organization.id,
        name: organization.name,
      },
      userRole,
      currentSubscription: currentSubscription
        ? {
            plan: {
              id: currentSubscription.plan.id,
            },
          }
        : null,
      availablePlans: allPlans.map((plan) => ({
        id: plan.id,
        nameI18n: plan.nameI18n,
        slug: plan.slug,
        descriptionI18n: plan.descriptionI18n,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        currency: plan.currency,
        pricingModel: plan.pricingModel,
        featuresI18n: plan.featuresI18n,
        trialDays: plan.trialDays,
        sortOrder: plan.sortOrder,
      })),
    })
  }

  async subscriptions({ inertia, user, organization }: HttpContext) {
    E.assertUserExists(user)
    E.assertOrganizationExists(organization)

    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const subscriptionRepo = getService<SubscriptionRepository>(TYPES.SubscriptionRepository)
    const planRepo = getService<PlanRepository>(TYPES.PlanRepository)
    const subscriptionService = getService<SubscriptionService>(TYPES.SubscriptionService)

    const userRole = await orgRepo.getUserRole(organization.id, user.id)

    const currentSubscription = await subscriptionRepo.findActiveByOrganizationId(organization.id)
    const allPlans = await planRepo.findActiveAndVisible()
    const stripeInvoices = await subscriptionService.getOrganizationInvoices(organization.id, 10)

    return inertia.render('organizations/settings-subscriptions', {
      organization: {
        id: organization.id,
        name: organization.name,
      },
      userRole,
      currentSubscription: currentSubscription
        ? {
            id: currentSubscription.id,
            status: currentSubscription.status,
            billingInterval: currentSubscription.billingInterval,
            quantity: currentSubscription.quantity,
            userCount: currentSubscription.userCount,
            currentPeriodStart: currentSubscription.currentPeriodStart?.toISO() || null,
            currentPeriodEnd: currentSubscription.currentPeriodEnd?.toISO() || null,
            trialEndsAt: currentSubscription.trialEndsAt?.toISO() || null,
            canceledAt: currentSubscription.canceledAt?.toISO() || null,
            plan: {
              id: currentSubscription.plan.id,
              nameI18n: currentSubscription.plan.nameI18n,
              slug: currentSubscription.plan.slug,
              descriptionI18n: currentSubscription.plan.descriptionI18n,
              priceMonthly: currentSubscription.plan.priceMonthly,
              priceYearly: currentSubscription.plan.priceYearly,
              currency: currentSubscription.plan.currency,
              featuresI18n: currentSubscription.plan.featuresI18n,
            },
          }
        : null,
      availablePlans: allPlans.map((plan) => ({
        id: plan.id,
        nameI18n: plan.nameI18n,
        slug: plan.slug,
        descriptionI18n: plan.descriptionI18n,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        currency: plan.currency,
        pricingModel: plan.pricingModel,
        featuresI18n: plan.featuresI18n,
        trialDays: plan.trialDays,
        sortOrder: plan.sortOrder,
      })),
      invoices: stripeInvoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        created: invoice.created,
        dueDate: invoice.due_date,
        invoicePdf: invoice.invoice_pdf,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      })),
    })
  }

  async uploadLogo({ request, response, user, organization, session }: HttpContext) {
    E.assertUserExists(user)
    E.assertOrganizationExists(organization)

    const logo = request.file('logo', {
      size: '2mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],
    })

    if (!logo) {
      session.flash('error', 'Aucun fichier fourni')
      return response.redirect('/organizations/settings')
    }

    const fileName = `${randomUUID()}.${logo.extname}`
    const uploadPath = app.makePath('public/uploads/logos')

    await logo.move(uploadPath, {
      name: fileName,
      overwrite: true,
    })

    if (!logo.isValid) {
      session.flash('error', `Erreur lors de l'upload: ${logo.errors.join(', ')}`)
      return response.redirect('/organizations/settings')
    }

    const logoUrl = `/uploads/logos/${fileName}`

    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    await orgRepo.update(
      organization.id,
      { logoUrl },
      {
        cache: { tags: ['organizations', `org_${organization.id}`] },
      }
    )

    session.flash('success', 'Logo mis à jour avec succès')

    return response.redirect('/organizations/settings')
  }

  async inviteMember({ request, response, user, organization, session }: HttpContext) {
    E.assertUserExists(user)
    E.assertOrganizationExists(organization)

    const data = await request.validateUsing(inviteMemberValidator)

    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const invitationRepo = getService<OrganizationInvitationRepository>(TYPES.OrganizationInvitationRepository)

    const currentUserRole = await orgRepo.getUserRole(organization.id, user.id)

    if (!currentUserRole || !['owner', 'admin'].includes(currentUserRole)) {
      session.flash('error', 'Vous devez être propriétaire ou administrateur pour inviter des membres')
      return response.redirect('/organizations/settings/users')
    }

    const existingUser = await userRepo.findByEmail(data.email)

    if (existingUser) {
      const isAlreadyMember = await orgRepo.isUserMember(organization.id, existingUser.id)

      if (isAlreadyMember) {
        session.flash('error', 'Cet utilisateur est déjà membre de l\'organisation')
        return response.redirect('/organizations/settings/users')
      }
    }

    const existingInvitation = await invitationRepo.invitationExists(data.email, organization.id)

    if (existingInvitation) {
      session.flash('error', 'Une invitation est déjà en attente pour cet email')
      return response.redirect('/organizations/settings/users')
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = DateTime.now().plus({ days: 7 })

    await invitationRepo.create({
      email: data.email,
      organizationId: organization.id,
      invitedById: user.id,
      role: data.role,
      token,
      expiresAt,
    } as any)

    session.flash('success', `Invitation créée pour ${data.email}`)

    return response.redirect('/organizations/settings/users')
  }

  async updateMemberRole({ request, response, user, organization, session }: HttpContext) {
    E.assertUserExists(user)
    E.assertOrganizationExists(organization)

    const data = await request.validateUsing(updateMemberRoleValidator)

    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    const currentUserRole = await orgRepo.getUserRole(organization.id, user.id)

    if (!currentUserRole || !['owner', 'admin'].includes(currentUserRole)) {
      session.flash('error', 'Vous devez être propriétaire ou administrateur pour modifier les rôles')
      return response.redirect('/organizations/settings/users')
    }

    if (data.userId === user.id) {
      session.flash('error', 'Vous ne pouvez pas modifier votre propre rôle')
      return response.redirect('/organizations/settings/users')
    }

    const isMember = await orgRepo.isUserMember(organization.id, data.userId)

    if (!isMember) {
      session.flash('error', "Cet utilisateur n'est pas membre de l'organisation")
      return response.redirect('/organizations/settings/users')
    }

    await orgRepo.updateUserRole(organization.id, data.userId, data.role)

    session.flash('success', 'Rôle mis à jour avec succès')

    return response.redirect('/organizations/settings/users')
  }

  async removeMember({ request, response, user, organization, session }: HttpContext) {
    E.assertUserExists(user)
    E.assertOrganizationExists(organization)

    const data = await request.validateUsing(removeMemberValidator)

    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    const currentUserRole = await orgRepo.getUserRole(organization.id, user.id)

    if (!currentUserRole || !['owner', 'admin'].includes(currentUserRole)) {
      session.flash('error', 'Vous devez être propriétaire ou administrateur pour supprimer des membres')
      return response.redirect('/organizations/settings/users')
    }

    if (data.userId === user.id) {
      session.flash('error', 'Vous ne pouvez pas vous retirer vous-même de l\'organisation')
      return response.redirect('/organizations/settings/users')
    }

    const isMember = await orgRepo.isUserMember(organization.id, data.userId)

    if (!isMember) {
      session.flash('error', "Cet utilisateur n'est pas membre de l'organisation")
      return response.redirect('/organizations/settings/users')
    }

    await orgRepo.removeUser(organization.id, data.userId)

    session.flash('success', 'Membre supprimé avec succès')

    return response.redirect('/organizations/settings/users')
  }

  async cancelInvitation({ params, response, user, organization, session }: HttpContext) {
    E.assertUserExists(user)
    E.assertOrganizationExists(organization)

    const { invitationId } = params

    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const invitationRepo = getService<OrganizationInvitationRepository>(TYPES.OrganizationInvitationRepository)

    const currentUserRole = await orgRepo.getUserRole(organization.id, user.id)

    if (!currentUserRole || !['owner', 'admin'].includes(currentUserRole)) {
      session.flash('error', 'Vous devez être propriétaire ou administrateur pour annuler des invitations')
      return response.redirect('/organizations/settings/users')
    }

    const invitation = await invitationRepo.findById(invitationId)

    if (!invitation) {
      session.flash('error', 'Invitation introuvable')
      return response.redirect('/organizations/settings/users')
    }

    if (invitation.organizationId !== organization.id) {
      session.flash('error', 'Cette invitation n\'appartient pas à votre organisation')
      return response.redirect('/organizations/settings/users')
    }

    await invitationRepo.delete(invitationId)

    session.flash('success', 'Invitation annulée avec succès')

    return response.redirect('/organizations/settings/users')
  }
}
