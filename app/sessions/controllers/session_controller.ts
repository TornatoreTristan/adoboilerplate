import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type SessionService from '#sessions/services/session_service'

export default class SessionController {
  async index({ response, session }: HttpContext) {
    const userId = session.get('user_id')
    const currentSessionId = session.get('session_id')

    // Récupérer toutes les sessions actives de l'utilisateur
    const sessionService = getService<SessionService>(TYPES.SessionService)
    const sessions = await sessionService.getUserActiveSessions(userId)

    // Marquer la session courante et formater les données
    const formattedSessions = sessions.map((userSession) => ({
      id: userSession.id,
      deviceType: userSession.deviceType,
      os: userSession.os,
      browser: userSession.browser,
      ipAddress: userSession.ipAddress,
      country: userSession.country,
      city: userSession.city,
      startedAt: userSession.startedAt,
      lastActivity: userSession.lastActivity,
      isCurrent: userSession.id === currentSessionId,
    }))

    return response.json({ sessions: formattedSessions })
  }

  async page({ inertia, session }: HttpContext) {
    const userId = session.get('user_id')
    const currentSessionId = session.get('session_id')

    // Importer le repository pour accéder aux sessions inactives
    const sessionService = getService<SessionService>(TYPES.SessionService)
    const { default: SessionRepository } = await import('#sessions/repositories/session_repository')
    const sessionRepo = getService<InstanceType<typeof SessionRepository>>(TYPES.SessionRepository)

    // Récupérer les sessions actives et inactives
    const [activeSessions, inactiveSessions] = await Promise.all([
      sessionService.getUserActiveSessions(userId),
      sessionRepo.findInactiveByUserId(userId, 20),
    ])

    // Formatter les sessions actives
    const formattedActiveSessions = activeSessions.map((userSession) => ({
      id: userSession.id,
      deviceType: userSession.deviceType || 'desktop',
      ipAddress: userSession.ipAddress,
      userAgent: this.formatUserAgent(userSession),
      location: this.formatLocation(userSession),
      lastActiveAt: userSession.lastActivity.toISO(),
      isCurrent: userSession.id === currentSessionId,
      isActive: true,
    }))

    // Formatter les sessions inactives
    const formattedInactiveSessions = inactiveSessions.map((userSession) => ({
      id: userSession.id,
      deviceType: userSession.deviceType || 'desktop',
      ipAddress: userSession.ipAddress,
      userAgent: this.formatUserAgent(userSession),
      location: this.formatLocation(userSession),
      lastActiveAt: userSession.lastActivity.toISO(),
      endedAt: userSession.endedAt?.toISO(),
      isCurrent: false,
      isActive: false,
    }))

    return inertia.render('account/sessions', {
      activeSessions: formattedActiveSessions,
      inactiveSessions: formattedInactiveSessions,
    })
  }

  private formatUserAgent(userSession: any): string {
    const parts = []

    if (userSession.browser) {
      parts.push(userSession.browser)
    }

    if (userSession.os) {
      parts.push(`sur ${userSession.os}`)
    }

    return parts.length > 0 ? parts.join(' ') : userSession.userAgent
  }

  private formatLocation(userSession: any): string | undefined {
    const parts = []

    if (userSession.city) {
      parts.push(userSession.city)
    }

    if (userSession.country) {
      parts.push(userSession.country)
    }

    return parts.length > 0 ? parts.join(', ') : undefined
  }

  async destroy({ params, response, session, request }: HttpContext) {
    const userId = session.get('user_id')
    const sessionIdToClose = params.id

    // Vérifier que la session appartient bien à l'utilisateur connecté
    const sessionService = getService<SessionService>(TYPES.SessionService)
    const sessionToClose = await sessionService.findById(sessionIdToClose)

    if (sessionToClose.userId !== userId) {
      return response.status(403)
    }

    // Fermer la session
    await sessionService.endSession(sessionIdToClose)

    // Pour les requêtes API, retourner JSON
    if (this.isApiRequest(request)) {
      return response.json({ success: true })
    }

    session.flash('success', 'Session déconnectée avec succès')
    return response.redirect().back()
  }

  async destroyOthers({ response, session, request }: HttpContext) {
    const userId = session.get('user_id')
    const currentSessionId = session.get('session_id')

    // Fermer toutes les sessions actives de l'utilisateur SAUF la courante
    const sessionService = getService<SessionService>(TYPES.SessionService)
    await sessionService.endAllOtherSessions(userId, currentSessionId)

    // Pour les requêtes API, retourner JSON
    if (this.isApiRequest(request)) {
      return response.json({ success: true })
    }

    session.flash('success', 'Toutes les autres sessions ont été déconnectées')
    return response.redirect().back()
  }

  private isApiRequest(request: any): boolean {
    if (request.header('x-inertia')) {
      return false
    }
    return (
      request.header('accept')?.includes('application/json') ||
      request.header('content-type')?.includes('application/json') ||
      request.url().startsWith('/api/') ||
      request.header('x-requested-with') === 'XMLHttpRequest'
    )
  }
}
