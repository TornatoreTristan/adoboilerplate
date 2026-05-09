import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type LogService from '#logs/services/log_service'
import type { LogFilters } from '#logs/types/log'

export default class LogsController {
  async index({ inertia }: HttpContext) {
    return inertia.render('admin/logs', {})
  }

  async list({ request, response }: HttpContext) {
    const logService = getService<LogService>(TYPES.LogService)

    const page = request.input('page', 1)
    const perPage = request.input('perPage', 50)

    const filters: LogFilters = {
      level: request.input('level'),
      search: request.input('search'),
      userId: request.input('userId'),
      startDate: request.input('startDate'),
      endDate: request.input('endDate'),
      method: request.input('method'),
      statusCode: request.input('statusCode'),
    }

    const logs = await logService.getLogs(filters, page, perPage)

    return response.json(logs)
  }

  async stats({ response }: HttpContext) {
    const logService = getService<LogService>(TYPES.LogService)
    const stats = await logService.getStats()

    return response.json(stats)
  }
}
