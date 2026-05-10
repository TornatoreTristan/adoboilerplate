import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AdminService from '#admin/services/admin_service'
import SubscriptionService from '#billing/services/subscription_service'
import { addUserToOrganizationValidator } from '#admin/validators/add_user_to_organization_validator'
import { AdminOrganizationDtoPresenter } from '#admin/presenters/admin_organization_dto'
import { asInertiaProps } from '#shared/types/inertia_props'

@inject()
export default class AdminOrganizationsController {
  constructor(
    private adminService: AdminService,
    private subscriptionService: SubscriptionService
  ) {}

  async organizations({ request, inertia }: HttpContext) {
    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('perPage', 20))

    const { data, meta } = await this.adminService.getOrganizations(page, perPage)

    return inertia.render(
      'admin/organizations',
      asInertiaProps({
        organizations: data,
        meta,
      })
    )
  }

  async organizationDetail({ params, inertia }: HttpContext) {
    const detail = await this.adminService.getOrganizationDetail(params.id)
    const invoices = await this.subscriptionService.getOrganizationInvoices(params.id, 50)

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
    const data = await request.validateUsing(addUserToOrganizationValidator)

    try {
      await this.adminService.addUserToOrganization(params.id, data.email, data.role)
      session.flash('success', i18n.t('admin.flash.user_added_to_organization'))
    } catch (error) {
      session.flashErrors({ email: error.message })
    }

    return response.redirect().back()
  }
}
