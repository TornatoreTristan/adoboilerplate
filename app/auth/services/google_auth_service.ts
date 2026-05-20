import { injectable, inject } from 'inversify'
import { DateTime } from 'luxon'
import { TYPES } from '#shared/container/types'
import UserRepository from '#users/repositories/user_repository'
import SessionService from '#sessions/services/session_service'
import type { OAuthUserData, OAuthCallbackResult } from '#shared/types/oauth'
import User from '#users/models/user'

interface SessionContext {
  ipAddress: string
  userAgent: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  referrer?: string
}

@injectable()
export default class GoogleAuthService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: UserRepository,
    @inject(TYPES.SessionService) private sessionService: SessionService
  ) {}

  async handleGoogleCallback(
    oauthData: OAuthUserData,
    sessionContext?: SessionContext
  ): Promise<OAuthCallbackResult> {
    let user: User | null = await this.findByGoogleId(oauthData.providerId)
    let isNewUser = false

    if (!user) {
      // Chercher même les users soft deleted
      const existingUser = await this.userRepository.findByEmailIncludingDeleted(oauthData.email)

      if (existingUser) {
        // Si soft deleted, restaurer le compte
        if (existingUser.deletedAt) {
          user = await this.userRepository.restoreDeletedUser(existingUser.id)
        } else {
          user = existingUser
        }
        // Lier le compte Google
        user = await this.linkGoogleAccount(user, oauthData)
      } else {
        user = await this.createUserFromGoogle(oauthData)
        isNewUser = true
      }
    } else {
      user = await this.updateUserProfile(user, oauthData)
    }

    let sessionId: string | undefined

    if (sessionContext) {
      const session = await this.sessionService.createSession({
        userId: user.id,
        ipAddress: sessionContext.ipAddress,
        userAgent: sessionContext.userAgent,
        utmSource: sessionContext.utmSource,
        utmMedium: sessionContext.utmMedium,
        utmCampaign: sessionContext.utmCampaign,
        referrer: sessionContext.referrer,
      })
      sessionId = session.id
    }

    return {
      user,
      isNewUser,
      sessionId,
    }
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOneBy({ googleId })
  }

  private async createUserFromGoogle(oauthData: OAuthUserData): Promise<User> {
    return this.userRepository.create({
      email: oauthData.email,
      password: null,
      googleId: oauthData.providerId,
      fullName: oauthData.name,
      avatarUrl: oauthData.avatar || null,
      emailVerifiedAt: DateTime.now(),
    })
  }

  private async linkGoogleAccount(user: User, oauthData: OAuthUserData): Promise<User> {
    return this.userRepository.update(user.id, {
      googleId: oauthData.providerId,
      fullName: oauthData.name,
      avatarUrl: oauthData.avatar || user.avatarUrl,
      emailVerifiedAt: user.emailVerifiedAt || DateTime.now(),
    })
  }

  private async updateUserProfile(user: User, oauthData: OAuthUserData): Promise<User> {
    // Ne mettre à jour que l'avatar lors d'une reconnexion
    // Le fullName est préservé (l'utilisateur peut l'avoir modifié manuellement)
    return this.userRepository.update(user.id, {
      avatarUrl: oauthData.avatar || user.avatarUrl,
    })
  }
}
