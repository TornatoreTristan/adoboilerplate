import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AdminService from '#admin/services/admin_service'
import { asInertiaProps } from '#shared/types/inertia_props'

@inject()
export default class AdminMailsController {
  constructor(private adminService: AdminService) {}

  async index({ inertia, request }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = request.input('perPage', 20)
    const status = request.input('status')
    const category = request.input('category')
    const search = request.input('search')

    const [logs, stats] = await Promise.all([
      this.adminService.getEmailLogs({ page, perPage, status, category, search }),
      this.adminService.getEmailLogsStats(),
    ])

    return inertia.render(
      'admin/mails',
      asInertiaProps({
        logs,
        stats,
        filters: { status, category, search },
      })
    )
  }
}
