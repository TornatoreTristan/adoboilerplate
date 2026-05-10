import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import UserRepository from '#users/repositories/user_repository'
import AdminService from '#admin/services/admin_service'
import { asInertiaProps } from '#shared/types/inertia_props'

@inject()
export default class AdminDashboardController {
  constructor(
    private userRepository: UserRepository,
    private adminService: AdminService
  ) {}

  async index({ inertia, session }: HttpContext) {
    const userId = session.get('user_id')

    const user = await this.userRepository.findByIdOrFail(userId)
    const stats = await this.adminService.getDashboardStats(30)

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
