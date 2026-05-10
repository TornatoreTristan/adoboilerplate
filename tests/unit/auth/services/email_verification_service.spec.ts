import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type EmailVerificationService from '#auth/services/email_verification_service'
import type UserRepository from '#users/repositories/user_repository'
import type EmailVerificationRepository from '#auth/repositories/email_verification_repository'

test.group('EmailVerificationService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create verification token for registration', async ({ assert }) => {
    const service = getService<EmailVerificationService>(TYPES.EmailVerificationService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    })

    const token = await service.createVerificationToken(user.id, 'registration')

    assert.equal(token.userId, user.id)
    assert.equal(token.email, user.email)
    assert.equal(token.type, 'registration')
    assert.isNotEmpty(token.token)
    assert.isTrue(token.expiresAt > DateTime.now())
  })

  test('should send verification email', async ({ assert }) => {
    const service = getService<EmailVerificationService>(TYPES.EmailVerificationService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    })

    await service.sendVerificationEmail(user.id)

    // Vérifie qu'un token a été créé
    const repo = getService<EmailVerificationRepository>(TYPES.EmailVerificationRepository)
    const token = await repo.findValidToken(user.id, 'registration')

    assert.isNotNull(token)
  })

  test('should verify valid token and mark email as verified', async ({ assert }) => {
    const service = getService<EmailVerificationService>(TYPES.EmailVerificationService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'password123',
    })

    await service.sendVerificationEmail(user.id)

    const repo = getService<EmailVerificationRepository>(TYPES.EmailVerificationRepository)
    const token = await repo.findValidToken(user.id, 'registration')

    const result = await service.verifyToken(token!.token)

    assert.isTrue(result.success)
    assert.equal(result.userId, user.id)

    // Vérifier que l'utilisateur est maintenant vérifié
    const updatedUser = await userRepo.findById(user.id)
    assert.isTrue(updatedUser!.isEmailVerified)
  })

  test('should reject expired token', async ({ assert }) => {
    const service = getService<EmailVerificationService>(TYPES.EmailVerificationService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const repo = getService<EmailVerificationRepository>(TYPES.EmailVerificationRepository)

    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'password123',
    })

    const token = await repo.create({
      userId: user.id,
      email: user.email,
      token: 'expired-token-123',
      type: 'registration',
      expiresAt: DateTime.now().minus({ hours: 1 }),
    })

    const result = await service.verifyToken(token.token)

    assert.isFalse(result.success)
    assert.isNotEmpty(result.error)
  })

  test('should reject invalid token', async ({ assert }) => {
    const service = getService<EmailVerificationService>(TYPES.EmailVerificationService)

    const result = await service.verifyToken('non-existent-token')

    assert.isFalse(result.success)
    assert.isNotEmpty(result.error)
  })

  test('should reject already verified token', async ({ assert }) => {
    const service = getService<EmailVerificationService>(TYPES.EmailVerificationService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const repo = getService<EmailVerificationRepository>(TYPES.EmailVerificationRepository)

    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'password123',
    })

    const token = await repo.create({
      userId: user.id,
      email: user.email,
      token: 'already-verified-123',
      type: 'registration',
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    await repo.markAsVerified(token.id)

    const result = await service.verifyToken(token.token)

    assert.isFalse(result.success)
    assert.isNotEmpty(result.error)
  })

  test('should resend verification email', async ({ assert }) => {
    const service = getService<EmailVerificationService>(TYPES.EmailVerificationService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const repo = getService<EmailVerificationRepository>(TYPES.EmailVerificationRepository)

    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'password123',
    })

    // Premier envoi
    await service.sendVerificationEmail(user.id)
    const firstToken = await repo.findValidToken(user.id, 'registration')

    // Resend
    await service.resendVerificationEmail(user.id)
    const secondToken = await repo.findValidToken(user.id, 'registration')

    assert.isNotNull(secondToken)
    assert.notEqual(firstToken!.token, secondToken!.token)
  })

  test('should request email change with valid password', async ({ assert }) => {
    const service = getService<EmailVerificationService>(TYPES.EmailVerificationService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'old@example.com',
      password: await hash.make('password123'),
    })

    await service.requestEmailChange(user.id, 'new@example.com', 'password123')

    const repo = getService<EmailVerificationRepository>(TYPES.EmailVerificationRepository)
    const token = await repo.findValidToken(user.id, 'email_change')

    assert.isNotNull(token)
    assert.equal(token!.email, 'new@example.com')
  })

  test('should reject email change with invalid password', async ({ assert }) => {
    const service = getService<EmailVerificationService>(TYPES.EmailVerificationService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'old@example.com',
      password: await hash.make('password123'),
    })

    try {
      await service.requestEmailChange(user.id, 'new@example.com', 'wrong-password')
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.exists(error)
    }
  })

  test('should verify email change token and update user email', async ({ assert }) => {
    const service = getService<EmailVerificationService>(TYPES.EmailVerificationService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'old@example.com',
      password: await hash.make('password123'),
    })

    await service.requestEmailChange(user.id, 'new@example.com', 'password123')

    const repo = getService<EmailVerificationRepository>(TYPES.EmailVerificationRepository)
    const token = await repo.findValidToken(user.id, 'email_change')

    const result = await service.verifyEmailChange(token!.token)

    assert.isTrue(result.success)
    assert.equal(result.email, 'new@example.com')

    // Vérifier que l'email a été mis à jour
    const updatedUser = await userRepo.findById(user.id)
    assert.equal(updatedUser!.email, 'new@example.com')
  })

  test('should not allow email change to existing email', async ({ assert }) => {
    const service = getService<EmailVerificationService>(TYPES.EmailVerificationService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user1 = await userRepo.create({
      email: 'user1@example.com',
      password: await hash.make('password123'),
    })

    await userRepo.create({
      email: 'user2@example.com',
      password: await hash.make('password123'),
    })

    try {
      await service.requestEmailChange(user1.id, 'user2@example.com', 'password123')
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.exists(error)
    }
  })
})
