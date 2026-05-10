import { test } from '@japa/runner'
import GoogleAuthService from '#auth/services/google_auth_service'
import type UserRepository from '#users/repositories/user_repository'
import type SessionService from '#sessions/services/session_service'
import type { OAuthUserData } from '#shared/types/oauth'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'

test.group('GoogleAuthService', (group) => {
  let googleAuthService: GoogleAuthService
  let userRepository: UserRepository

  group.setup(() => {
    googleAuthService = new GoogleAuthService(
      getService<UserRepository>(TYPES.UserRepository),
      getService<SessionService>(TYPES.SessionService)
    )
    userRepository = getService<UserRepository>(TYPES.UserRepository)
  })

  group.each.teardown(async () => {
    const { default: User } = await import('#users/models/user')
    await User.query().delete()
  })

  test('should create new user from Google OAuth data', async ({ assert }) => {
    const oauthData: OAuthUserData = {
      providerId: 'google-123',
      provider: 'google',
      email: 'newuser@gmail.com',
      name: 'New User',
      avatar: 'https://example.com/avatar.jpg',
    }

    const result = await googleAuthService.handleGoogleCallback(oauthData)

    assert.isTrue(result.isNewUser)
    assert.exists(result.user)
    assert.equal(result.user.email, oauthData.email)
    assert.equal(result.user.googleId, oauthData.providerId)
    assert.equal(result.user.fullName, oauthData.name)
    assert.equal(result.user.avatarUrl, oauthData.avatar)
    assert.isNull(result.user.password)
  })

  test('should login existing user with Google ID', async ({ assert }) => {
    const existingUser = await userRepository.create({
      email: 'existing@gmail.com',
      password: null,
      googleId: 'google-456',
      fullName: 'Existing User',
      avatarUrl: 'https://example.com/old-avatar.jpg',
    })

    const oauthData: OAuthUserData = {
      providerId: 'google-456',
      provider: 'google',
      email: 'existing@gmail.com',
      name: 'Existing User Updated',
      avatar: 'https://example.com/new-avatar.jpg',
    }

    const result = await googleAuthService.handleGoogleCallback(oauthData)

    assert.isFalse(result.isNewUser)
    assert.equal(result.user.id, existingUser.id)
    assert.equal(result.user.email, oauthData.email)
    // fullName is preserved to allow manual user modifications
    assert.equal(result.user.fullName, 'Existing User')
    // avatarUrl is updated on each login
    assert.equal(result.user.avatarUrl, oauthData.avatar)
  })

  test('should link Google account to existing email-based user', async ({ assert }) => {
    const existingUser = await userRepository.create({
      email: 'emailuser@gmail.com',
      password: 'hashed-password',
      googleId: null,
      fullName: 'Email User',
    })

    const oauthData: OAuthUserData = {
      providerId: 'google-789',
      provider: 'google',
      email: 'emailuser@gmail.com',
      name: 'Email User',
    }

    const result = await googleAuthService.handleGoogleCallback(oauthData)

    assert.isFalse(result.isNewUser)
    assert.equal(result.user.id, existingUser.id)
    assert.equal(result.user.googleId, oauthData.providerId)
    assert.isNotNull(result.user.password)
  })

  test('should update user profile on each login', async ({ assert }) => {
    await userRepository.create({
      email: 'update@gmail.com',
      password: null,
      googleId: 'google-update',
      fullName: 'Old Name',
      avatarUrl: 'https://example.com/old.jpg',
    })

    const oauthData: OAuthUserData = {
      providerId: 'google-update',
      provider: 'google',
      email: 'update@gmail.com',
      name: 'New Name',
      avatar: 'https://example.com/new.jpg',
    }

    const result = await googleAuthService.handleGoogleCallback(oauthData)

    // fullName is preserved to allow manual user modifications
    assert.equal(result.user.fullName, 'Old Name')
    // Only avatarUrl is updated on each login
    assert.equal(result.user.avatarUrl, 'https://example.com/new.jpg')
  })

  test('should find user by Google ID', async ({ assert }) => {
    const user = await userRepository.create({
      email: 'findme@gmail.com',
      password: null,
      googleId: 'google-find-me',
      fullName: 'Find Me',
    })

    const found = await googleAuthService.findByGoogleId('google-find-me')

    assert.exists(found)
    assert.equal(found!.id, user.id)
    assert.equal(found!.googleId, 'google-find-me')
  })

  test('should return null when Google ID not found', async ({ assert }) => {
    const found = await googleAuthService.findByGoogleId('non-existent-google-id')

    assert.isNull(found)
  })

  test('should create session when handling callback', async ({ assert }) => {
    const oauthData: OAuthUserData = {
      providerId: 'google-session',
      provider: 'google',
      email: 'session@gmail.com',
      name: 'Session User',
    }

    const result = await googleAuthService.handleGoogleCallback(oauthData, {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    })

    assert.exists(result.sessionId)
  })

  test('should handle missing optional fields', async ({ assert }) => {
    const oauthData: OAuthUserData = {
      providerId: 'google-minimal',
      provider: 'google',
      email: 'minimal@gmail.com',
      name: 'Minimal User',
    }

    const result = await googleAuthService.handleGoogleCallback(oauthData)

    assert.exists(result.user)
    assert.equal(result.user.email, oauthData.email)
    assert.isNull(result.user.avatarUrl)
  })
})
