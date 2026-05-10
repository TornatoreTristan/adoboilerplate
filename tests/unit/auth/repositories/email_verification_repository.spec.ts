import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type EmailVerificationRepository from '#auth/repositories/email_verification_repository'
import type UserRepository from '#users/repositories/user_repository'

test.group('EmailVerificationRepository', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create a verification token', async ({ assert }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const repo = getService<EmailVerificationRepository>(TYPES.EmailVerificationRepository)

    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    })

    const token = await repo.create({
      userId: user.id,
      email: user.email,
      token: 'test-token-123',
      type: 'registration',
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    assert.equal(token.userId, user.id)
    assert.equal(token.email, user.email)
    assert.equal(token.token, 'test-token-123')
    assert.equal(token.type, 'registration')
    assert.isFalse(token.isVerified)
  })

  test('should find token by token string', async ({ assert }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const repo = getService<EmailVerificationRepository>(TYPES.EmailVerificationRepository)

    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'password123',
    })

    await repo.create({
      userId: user.id,
      email: user.email,
      token: 'unique-token-456',
      type: 'registration',
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    const found = await repo.findByToken('unique-token-456')

    assert.isNotNull(found)
    assert.equal(found!.token, 'unique-token-456')
  })

  test('should return null for non-existent token', async ({ assert }) => {
    const repo = getService<EmailVerificationRepository>(TYPES.EmailVerificationRepository)

    const found = await repo.findByToken('non-existent-token')

    assert.isNull(found)
  })

  test('should find valid token for user and type', async ({ assert }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const repo = getService<EmailVerificationRepository>(TYPES.EmailVerificationRepository)

    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'password123',
    })

    await repo.create({
      userId: user.id,
      email: user.email,
      token: 'reg-token',
      type: 'registration',
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    const found = await repo.findValidToken(user.id, 'registration')

    assert.isNotNull(found)
    assert.equal(found!.type, 'registration')
    assert.isFalse(found!.isExpired)
    assert.isFalse(found!.isVerified)
  })

  test('should not return expired token as valid', async ({ assert }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const repo = getService<EmailVerificationRepository>(TYPES.EmailVerificationRepository)

    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'password123',
    })

    await repo.create({
      userId: user.id,
      email: user.email,
      token: 'expired-token',
      type: 'registration',
      expiresAt: DateTime.now().minus({ hours: 1 }),
    })

    const found = await repo.findValidToken(user.id, 'registration')

    assert.isNull(found)
  })

  test('should not return verified token as valid', async ({ assert }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const repo = getService<EmailVerificationRepository>(TYPES.EmailVerificationRepository)

    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'password123',
    })

    const token = await repo.create({
      userId: user.id,
      email: user.email,
      token: 'verified-token',
      type: 'registration',
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    await repo.update(token.id, { verifiedAt: DateTime.now() })

    const found = await repo.findValidToken(user.id, 'registration')

    assert.isNull(found)
  })

  test('should mark token as verified', async ({ assert }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const repo = getService<EmailVerificationRepository>(TYPES.EmailVerificationRepository)

    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'password123',
    })

    const token = await repo.create({
      userId: user.id,
      email: user.email,
      token: 'to-verify-token',
      type: 'registration',
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    await repo.markAsVerified(token.id)

    const updated = await repo.findById(token.id)
    assert.isNotNull(updated!.verifiedAt)
    assert.isTrue(updated!.isVerified)
  })

  test('should delete tokens by user and type', async ({ assert }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const repo = getService<EmailVerificationRepository>(TYPES.EmailVerificationRepository)

    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'password123',
    })

    await repo.create({
      userId: user.id,
      email: user.email,
      token: 'token-1',
      type: 'registration',
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    await repo.create({
      userId: user.id,
      email: 'newemail@example.com',
      token: 'token-2',
      type: 'email_change',
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    await repo.deleteByUserAndType(user.id, 'registration')

    const regToken = await repo.findValidToken(user.id, 'registration')
    const changeToken = await repo.findValidToken(user.id, 'email_change')

    assert.isNull(regToken)
    assert.isNotNull(changeToken)
  })

  test('should use model getters correctly', async ({ assert }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const repo = getService<EmailVerificationRepository>(TYPES.EmailVerificationRepository)

    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'password123',
    })

    const token = await repo.create({
      userId: user.id,
      email: user.email,
      token: 'getter-test',
      type: 'registration',
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    assert.isFalse(token.isExpired)
    assert.isFalse(token.isVerified)
    assert.isTrue(token.isValid)
  })
})
