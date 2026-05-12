export type OAuthProvider = 'google'

export interface OAuthUserData {
  providerId: string
  provider: OAuthProvider
  email: string
  name: string
  avatar?: string
}

export interface GoogleUserProfile {
  id: string
  email: string
  name: string
  given_name?: string
  family_name?: string
  picture?: string
  verified_email?: boolean
  locale?: string
}

import type User from '#users/models/user'

export interface OAuthCallbackResult {
  user: User
  isNewUser: boolean
  sessionId?: string
}
