import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AdminService from '#admin/services/admin_service'
import { asInertiaProps } from '#shared/types/inertia_props'

export default class AdminMailsController {
  async index({ inertia, request }: HttpContext) {
    const adminService = getService<AdminService>(TYPES.AdminService)

    const page = request.input('page', 1)
    const perPage = request.input('perPage', 20)
    const status = request.input('status')
    const category = request.input('category')
    const search = request.input('search')

    const [logs, stats] = await Promise.all([
      adminService.getEmailLogs({ page, perPage, status, category, search }),
      adminService.getEmailLogsStats(),
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
