import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserService from '#users/services/user_service'
import type UserRepository from '#users/repositories/user_repository'
import type EmailService from '#mailing/services/email_service'

test.group('Email locale — user.locale drives email language', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('user created via UserService without explicit locale defaults to fr', async ({
    assert,
  }) => {
    const userService = getService<UserService>(TYPES.UserService)

    const user = await userService.create({
      email: 'default@example.com',
      password: 'password123',
    })

    assert.equal(user.locale, 'fr')
  })

  test('user created via UserService with locale en retains en', async ({ assert }) => {
    const userService = getService<UserService>(TYPES.UserService)

    const user = await userService.create({
      email: 'english@example.com',
      password: 'password123',
      locale: 'en',
    })

    assert.equal(user.locale, 'en')
  })

  test('user created directly with locale via repository retains locale', async ({ assert }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'direct@example.com',
      password: 'password123',
      locale: 'en',
    })

    assert.equal(user.locale, 'en')
  })

  test('password reset email translations use en for en user', async ({ assert }) => {
    const emailService = getService<EmailService>(TYPES.EmailService)

    const frTranslations = emailService.buildPasswordResetTranslations('fr', {
      userName: 'Alice',
      expiresIn: '1 heure',
    })

    const enTranslations = emailService.buildPasswordResetTranslations('en', {
      userName: 'Alice',
      expiresIn: '1 hour',
    })

    assert.notEqual(frTranslations.subject, enTranslations.subject)
    assert.isNotEmpty(enTranslations.subject)
    assert.isNotEmpty(frTranslations.subject)
  })

  test('welcome email translations differ between fr and en', async ({ assert }) => {
    const emailService = getService<EmailService>(TYPES.EmailService)

    const frTranslations = emailService.buildWelcomeTranslations('fr', { userName: 'Alice' })
    const enTranslations = emailService.buildWelcomeTranslations('en', { userName: 'Alice' })

    assert.notEqual(frTranslations.subject, enTranslations.subject)
    assert.isNotEmpty(enTranslations.subject)
    assert.isNotEmpty(frTranslations.subject)
  })
})
