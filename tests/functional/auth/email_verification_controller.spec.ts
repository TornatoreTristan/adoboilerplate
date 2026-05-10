import { test } from '@japa/runner'
import User from '#users/models/user'
import EmailVerificationToken from '#auth/models/email_verification_token'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import string from '@adonisjs/core/helpers/string'

test.group('EmailVerificationController', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('POST /auth/email/resend - should resend verification email for authenticated user', async ({
    assert,
    client,
  }) => {
    const user = await User.create({
      email: 'user@example.com',
      password: await hash.make('password123'),
    })

    const response = await client
      .post('/auth/email/resend')
      .withCsrfToken()
      .withSession({ user_id: user.id })

    response.assertStatus(200)
    response.assertBodyContains({
      success: true,
      message: "Email de vérification envoyé à l'adresse user@example.com",
    })

    const token = await EmailVerificationToken.query()
      .where('user_id', user.id)
      .where('type', 'registration')
      .first()

    assert.isNotNull(token)
  })

  test('POST /auth/email/resend - should return 401 if not authenticated', async ({ client }) => {
    const response = await client
      .post('/auth/email/resend')
      .withCsrfToken()
      .header('accept', 'application/json')

    response.assertStatus(401)
  })

  test('GET /auth/email/verify/:token - should verify valid token', async ({
    assert,
    client,
  }) => {
    const user = await User.create({
      email: 'user@example.com',
      password: await hash.make('password123'),
    })

    const token = await EmailVerificationToken.create({
      userId: user.id,
      email: user.email,
      token: string.generateRandom(64),
      type: 'registration',
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    const response = await client.get(`/auth/email/verify/${token.token}`)

    response.assertStatus(200)
    response.assertBodyContains({
      success: true,
      message: 'Email vérifié avec succès',
    })

    await user.refresh()
    assert.isTrue(user.isEmailVerified)
  })

  test('GET /auth/email/verify/:token - should reject invalid token', async ({ client }) => {
    const response = await client.get('/auth/email/verify/invalid-token')

    response.assertStatus(400)
    response.assertBodyContains({
      success: false,
    })
  })

  test('GET /auth/email/verify/:token - should reject expired token', async ({ client }) => {
    const user = await User.create({
      email: 'user@example.com',
      password: await hash.make('password123'),
    })

    const token = await EmailVerificationToken.create({
      userId: user.id,
      email: user.email,
      token: string.generateRandom(64),
      type: 'registration',
      expiresAt: DateTime.now().minus({ hours: 1 }),
    })

    const response = await client.get(`/auth/email/verify/${token.token}`)

    response.assertStatus(400)
    response.assertBodyContains({
      success: false,
    })
  })

  test('POST /auth/email/change - should request email change with valid password', async ({
    assert,
    client,
  }) => {
    const user = await User.create({
      email: 'old@example.com',
      password: await hash.make('password123'),
    })

    const response = await client
      .post('/auth/email/change')
      .withCsrfToken()
      .withSession({ user_id: user.id })
      .json({
        newEmail: 'new@example.com',
        password: 'password123',
      })

    response.assertStatus(200)
    response.assertBodyContains({
      success: true,
      message: 'Email de confirmation envoyé à new@example.com',
    })

    const token = await EmailVerificationToken.query()
      .where('user_id', user.id)
      .where('type', 'email_change')
      .first()

    assert.isNotNull(token)
    assert.equal(token!.email, 'new@example.com')
  })

  test('POST /auth/email/change - should reject invalid password', async ({ client }) => {
    const user = await User.create({
      email: 'old@example.com',
      password: await hash.make('password123'),
    })

    const response = await client
      .post('/auth/email/change')
      .withCsrfToken()
      .withSession({ user_id: user.id })
      .json({
        newEmail: 'new@example.com',
        password: 'wrong-password',
      })

    response.assertStatus(401)
  })

  test('POST /auth/email/change - should validate email format', async ({ client }) => {
    const user = await User.create({
      email: 'user@example.com',
      password: await hash.make('password123'),
    })

    const response = await client
      .post('/auth/email/change')
      .withCsrfToken()
      .withSession({ user_id: user.id })
      .json({
        newEmail: 'invalid-email',
        password: 'password123',
      })

    response.assertStatus(422)
  })

  test('POST /auth/email/change - should return 401 if not authenticated', async ({ client }) => {
    const response = await client
      .post('/auth/email/change')
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({
        newEmail: 'new@example.com',
        password: 'password123',
      })

    response.assertStatus(401)
  })

  test('GET /auth/email/change/verify/:token - should verify email change token', async ({
    assert,
    client,
  }) => {
    const user = await User.create({
      email: 'old@example.com',
      password: await hash.make('password123'),
    })

    const token = await EmailVerificationToken.create({
      userId: user.id,
      email: 'new@example.com',
      token: string.generateRandom(64),
      type: 'email_change',
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    const response = await client.get(`/auth/email/change/verify/${token.token}`)

    response.assertStatus(200)
    response.assertBodyContains({
      success: true,
      message: 'Email modifié avec succès',
    })

    await user.refresh()
    assert.equal(user.email, 'new@example.com')
    assert.isTrue(user.isEmailVerified)
  })

  test('GET /auth/email/change/verify/:token - should reject invalid email change token', async ({
    client,
  }) => {
    const response = await client.get('/auth/email/change/verify/invalid-token')

    response.assertStatus(400)
    response.assertBodyContains({
      success: false,
    })
  })
})
