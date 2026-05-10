import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AdminService from '#admin/services/admin_service'
import { asInertiaProps } from '#shared/types/inertia_props'

export default class AdminRolesController {
  async roles({ inertia }: HttpContext) {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const roles = await adminService.getRoles()

    return inertia.render('admin/roles', asInertiaProps({ roles }))
  }

  async roleDetail({ params, inertia }: HttpContext) {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const detail = await adminService.getRoleDetail(params.id)

    return inertia.render(
      'admin/role-detail',
      asInertiaProps({ role: detail.role, permissions: detail.permissions })
    )
  }
}
