import { DateTime } from 'luxon'
import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import type SessionRepository from '#sessions/repositories/session_repository'
import type UserSession from '#sessions/models/user_session'
import type { CreateSessionData } from '#shared/types/session'

@injectable()
export default class SessionService {
  constructor(@inject(TYPES.SessionRepository) private sessionRepo: SessionRepository) {}

  async createSession(sessionData: CreateSessionData): Promise<UserSession> {
    const now = DateTime.now()

    // Parser automatiquement le User-Agent
    const ua = sessionData.userAgent.toLowerCase()

    // Détection du type d'appareil
    let deviceType = 'desktop'
    if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
      deviceType = 'mobile'
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet'
    }

    // Détection de l'OS
    let os = 'Unknown'
    if (ua.includes('iphone') || ua.includes('ios')) os = 'iOS'
    else if (ua.includes('android')) os = 'Android'
    else if (ua.includes('windows')) os = 'Windows'
    else if (ua.includes('mac os') || ua.includes('macos')) os = 'macOS'
    else if (ua.includes('linux')) os = 'Linux'

    // Détection du navigateur
    let browser = 'Unknown'
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome'
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
    else if (ua.includes('firefox')) browser = 'Firefox'
    else if (ua.includes('edg')) browser = 'Edge'

    return await this.sessionRepo.create({
      userId: sessionData.userId,
      ipAddress: sessionData.ipAddress,
      userAgent: sessionData.userAgent,
      startedAt: now,
      lastActivity: now,
      endedAt: null,
      isActive: true,
      deviceType,
      os,
      browser,
      referrer: sessionData.referrer || null,
      utmSource: sessionData.utmSource || null,
      utmMedium: sessionData.utmMedium || null,
      utmCampaign: sessionData.utmCampaign || null,
      country: null,
      city: null,
      region: null,
    })
  }

  async endSession(sessionId: string): Promise<UserSession> {
    return await this.sessionRepo.closeSession(sessionId)
  }

  async findById(sessionId: string): Promise<UserSession> {
    return await this.sessionRepo.findByIdOrFail(sessionId)
  }

  async updateActivity(sessionId: string): Promise<void> {
    await this.sessionRepo.updateLastActivity(sessionId)
  }

  async getUserActiveSessions(userId: string): Promise<UserSession[]> {
    return await this.sessionRepo.findActiveByUserId(userId)
  }

  async endAllOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    await this.sessionRepo.closeOtherUserSessions(userId, currentSessionId)
  }
}
