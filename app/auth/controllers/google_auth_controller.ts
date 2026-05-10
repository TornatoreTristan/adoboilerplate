import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import GoogleAuthService from '#auth/services/google_auth_service'
import type { OAuthUserData } from '#shared/types/oauth'

export default class GoogleAuthController {
  async redirect({ ally }: HttpContext) {
    return ally.use('google').redirect()
  }

  async callback({ ally, session, request, response }: HttpContext) {
    const google = ally.use('google')

    if (google.accessDenied()) {
      return response.redirect('/')
    }

    if (google.stateMisMatch()) {
      return response.redirect('/')
    }

    if (google.hasError()) {
      return response.redirect('/')
    }

    const googleUser = await google.user()

    const oauthData: OAuthUserData = {
      providerId: googleUser.id,
      provider: 'google',
      email: googleUser.email!,
      name: googleUser.name,
      avatar: googleUser.avatarUrl,
    }

    const googleAuthService = getService<GoogleAuthService>(TYPES.GoogleAuthService)

    const result = await googleAuthService.handleGoogleCallback(oauthData, {
      ipAddress: request.ip() || 'unknown',
      userAgent: request.header('user-agent') || 'unknown',
      utmSource: request.input('utm_source'),
      utmMedium: request.input('utm_medium'),
      utmCampaign: request.input('utm_campaign'),
      referrer: request.header('referer'),
    })

    // Régénérer l'ID de session pour prévenir la session fixation
    session.regenerate()

    session.put('user_id', result.user.id)
    if (result.sessionId) {
      session.put('session_id', result.sessionId)
    }

    return response.redirect('/')
  }
}