import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AdminService from '#admin/services/admin_service'
import { asInertiaProps } from '#shared/types/inertia_props'

@inject()
export default class AdminRolesController {
  constructor(private adminService: AdminService) {}

  async roles({ inertia }: HttpContext) {
    const roles = await this.adminService.getRoles()

    return inertia.render('admin/roles', asInertiaProps({ roles }))
  }

  async roleDetail({ params, inertia }: HttpContext) {
    const detail = await this.adminService.getRoleDetail(params.id)

    return inertia.render(
      'admin/role-detail',
      asInertiaProps({ role: detail.role, permissions: detail.permissions })
    )
  }
}
