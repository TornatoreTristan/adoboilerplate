import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type HealthService from '#health/services/health_service'
import env from '#start/env'

export default class HealthController {
  async liveness({ response }: HttpContext) {
    const healthService = getService<HealthService>(TYPES.HealthService)
    const result = await healthService.liveness()

    return response.status(200).json({ status: result.status })
  }

  async readiness({ request, response }: HttpContext) {
    const healthService = getService<HealthService>(TYPES.HealthService)
    const configuredToken = env.get('HEALTH_CHECK_TOKEN')

    if (!configuredToken) {
      const minimal = await healthService.liveness()
      const statusCode = minimal.status === 'down' ? 503 : 200
      return response.status(statusCode).json({ status: minimal.status })
    }

    const authHeader = request.header('authorization') || ''
    const providedToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (providedToken !== configuredToken) {
      return response.status(401).json({ status: 'unauthorized' })
    }

    const result = await healthService.readiness()
    const statusCode = result.status === 'down' ? 503 : 200

    return response.status(statusCode).json(result)
  }
}
