import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AdminService from '#admin/services/admin_service'
import type SubscriptionService from '#billing/services/subscription_service'
import { addUserToOrganizationValidator } from '#admin/validators/add_user_to_organization_validator'
import { AdminOrganizationDtoPresenter } from '#admin/presenters/admin_organization_dto'
import { asInertiaProps } from '#shared/types/inertia_props'

export default class AdminOrganizationsController {
  async organizations({ request, inertia }: HttpContext) {
    const adminService = getService<AdminService>(TYPES.AdminService)

    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('perPage', 20))

    const { data, meta } = await adminService.getOrganizations(page, perPage)

    return inertia.render(
      'admin/organizations',
      asInertiaProps({
        organizations: data,
        meta,
      })
    )
  }

  async organizationDetail({ params, inertia }: HttpContext) {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const subscriptionService = getService<SubscriptionService>(TYPES.SubscriptionService)

    const detail = await adminService.getOrganizationDetail(params.id)
    const invoices = await subscriptionService.getOrganizationInvoices(params.id, 50)

    return inertia.render(
      'admin/organization-detail',
      asInertiaProps({
        organization: detail.organization,
        members: detail.members,
        invoices: invoices.map((invoice) => AdminOrganizationDtoPresenter.presentInvoice(invoice)),
      })
    )
  }

  async addUserToOrganization({ params, request, response, session, i18n }: HttpContext) {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const data = await request.validateUsing(addUserToOrganizationValidator)

    try {
      await adminService.addUserToOrganization(params.id, data.email, data.role)
      session.flash('success', i18n.t('admin.flash.user_added_to_organization'))
    } catch (error) {
      session.flashErrors({ email: error.message })
    }

    return response.redirect().back()
  }
}
