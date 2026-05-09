import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type MonitoringService from '#health/services/monitoring_service'
import { DateTime } from 'luxon'

export default class MonitoringController {
  async index({ inertia }: HttpContext) {
    return inertia.render('admin/monitoring', {})
  }

  async data({ response }: HttpContext) {
    const monitoringService = getService<MonitoringService>(TYPES.MonitoringService)
    const data = await monitoringService.getFullMonitoringData()

    return response.json(data)
  }

  async history({ request, response }: HttpContext) {
    const monitoringService = getService<MonitoringService>(TYPES.MonitoringService)

    const startDate = request.input('startDate')
    const endDate = request.input('endDate')

    let history
    if (startDate && endDate) {
      history = await monitoringService.getHistoryForPeriod(
        DateTime.fromISO(startDate),
        DateTime.fromISO(endDate)
      )
    } else {
      history = await monitoringService.getHistoryLast24Hours()
    }

    return response.json({ history })
  }
}
