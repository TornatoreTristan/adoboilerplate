import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type SessionService from '#sessions/services/session_service'

const SESSION_ROTATION_INTERVAL_MS = 30 * 60 * 1000

export default class UpdateSessionActivityMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { session } = ctx

    await next()

    const sessionId = session.get('session_id')

    if (sessionId) {
      this.rotateSessionIfDue(session)

      const sessionService = getService<SessionService>(TYPES.SessionService)
      await sessionService.updateActivity(sessionId)
    }
  }

  private rotateSessionIfDue(session: HttpContext['session']): void {
    const lastRotatedAt = session.get('last_rotated_at') as number | undefined
    const now = Date.now()

    if (!lastRotatedAt || now - lastRotatedAt > SESSION_ROTATION_INTERVAL_MS) {
      session.regenerate()
      session.put('last_rotated_at', now)
    }
  }
}
