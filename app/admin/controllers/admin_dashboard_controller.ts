import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserRepository from '#users/repositories/user_repository'
import type AdminService from '#admin/services/admin_service'
import { asInertiaProps } from '#shared/types/inertia_props'

export default class AdminDashboardController {
  async index({ inertia, session }: HttpContext) {
    const userId = session.get('user_id')
    const userRepository = getService<UserRepository>(TYPES.UserRepository)
    const adminService = getService<AdminService>(TYPES.AdminService)

    const user = await userRepository.findByIdOrFail(userId)
    const stats = await adminService.getDashboardStats(30)

    return inertia.render(
      'admin/index',
      asInertiaProps({
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
        },
        stats,
      })
    )
  }
}
