import factory from '@adonisjs/lucid/factories'
import { faker } from '@faker-js/faker'
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import User from '#users/models/user'

export const UserFactory = factory
  .define(User, async () => {
    const hashedPassword = await hash.make('Password123!')

    return {
      fullName: faker.person.fullName(),
      email: faker.internet.email({ provider: 'example.com' }).toLowerCase(),
      password: hashedPassword,
      googleId: null,
      avatarUrl: null,
      emailVerifiedAt: null,
      locale: 'fr' as const,
      newsletterEnabled: false,
      tipsEnabled: true,
      promotionalOffersEnabled: false,
      twoFactorSecret: null,
      twoFactorEnabled: false,
      twoFactorBackupCodes: [],
      twoFactorConfirmedAt: null,
    }
  })
  .state('verified', (user) => {
    user.emailVerifiedAt = DateTime.now().minus({ days: faker.number.int({ min: 1, max: 30 }) })
  })
  .state('withAvatar', (user) => {
    user.avatarUrl = faker.image.avatar()
  })
  .state('twoFactorEnabled', (user) => {
    user.twoFactorEnabled = true
  })
  .state('newsletterSubscribed', (user) => {
    user.newsletterEnabled = true
    user.promotionalOffersEnabled = true
  })
  .build()
