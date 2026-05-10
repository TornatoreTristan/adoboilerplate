import { test } from '@japa/runner'
import User from '#users/models/user'
import PasswordResetToken from '#auth/models/password_reset_token'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import crypto from 'node:crypto'

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

test.group('PasswordResetController', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('POST /password/forgot - devrait créer un token pour un email valide', async ({
    assert,
    client
  }) => {
    // Arrange
    const user = await User.create({
      email: 'user@example.com',
      password: await hash.make('password123')
    })

    // Act
    const response = await client
      .post('/password/forgot')
      .withCsrfToken()
      .json({ email: user.email })

    // Assert
    response.assertStatus(200)
    response.assertBodyContains({
      success: true,
      message: 'Si cette adresse email existe, vous recevrez un lien de réinitialisation'
    })

    // Vérifier que le token a été créé
    const token = await PasswordResetToken.findBy('email', user.email)
    assert.isNotNull(token)
    assert.isString(token?.token)
    assert.isTrue(token!.expiresAt > DateTime.now())
  })

  test('POST /password/forgot - devrait retourner succès même pour email inexistant (sécurité)', async ({
    client
  }) => {
    // Act
    const response = await client
      .post('/password/forgot')
      .withCsrfToken()
      .json({ email: 'nonexistent@example.com' })

    // Assert
    response.assertStatus(200)
    response.assertBodyContains({
      success: true,
      message: 'Si cette adresse email existe, vous recevrez un lien de réinitialisation'
    })
  })

  test('POST /password/forgot - devrait valider le format email', async ({ client }) => {
    // Act
    const response = await client
      .post('/password/forgot')
      .withCsrfToken()
      .json({ email: 'invalid-email' })

    // Assert
    response.assertStatus(422)
    response.assertBodyContains({
      errors: [
        {
          field: 'email'
        }
      ]
    })
  })

  test('GET /password/reset/:token - devrait valider un token valide', async ({ client }) => {
    // Arrange
    const token = crypto.randomBytes(32).toString('hex')
    await PasswordResetToken.create({
      email: 'user@example.com',
      token: hashToken(token),
      expiresAt: DateTime.now().plus({ hours: 1 })
    })

    // Act
    const response = await client.get(`/password/reset/${token}`)

    // Assert
    response.assertStatus(200)
    response.assertBodyContains({
      valid: true,
      email: 'user@example.com'
    })
  })

  test('GET /password/reset/:token - devrait rejeter un token expiré', async ({ client }) => {
    // Arrange
    const token = crypto.randomBytes(32).toString('hex')
    await PasswordResetToken.create({
      email: 'user@example.com',
      token: hashToken(token),
      expiresAt: DateTime.now().minus({ hours: 1 })
    })

    // Act
    const response = await client.get(`/password/reset/${token}`)

    // Assert
    response.assertStatus(400)
    response.assertBodyContains({
      valid: false,
      error: 'Ce lien de réinitialisation a expiré'
    })
  })

  test('GET /password/reset/:token - devrait rejeter un token déjà utilisé', async ({ client }) => {
    // Arrange
    const token = crypto.randomBytes(32).toString('hex')
    await PasswordResetToken.create({
      email: 'user@example.com',
      token: hashToken(token),
      expiresAt: DateTime.now().plus({ hours: 1 }),
      usedAt: DateTime.now().minus({ minutes: 30 })
    })

    // Act
    const response = await client.get(`/password/reset/${token}`)

    // Assert
    response.assertStatus(400)
    response.assertBodyContains({
      valid: false,
      error: 'Ce lien de réinitialisation a déjà été utilisé'
    })
  })

  test('GET /password/reset/:token - devrait rejeter un token invalide', async ({ client }) => {
    // Act
    const response = await client.get('/password/reset/invalid-token')

    // Assert
    response.assertStatus(400)
    response.assertBodyContains({
      valid: false,
      error: 'Lien de réinitialisation invalide'
    })
  })

  test('POST /password/reset - devrait réinitialiser le mot de passe avec un token valide', async ({
    assert,
    client
  }) => {
    // Arrange
    const user = await User.create({
      email: 'user@example.com',
      password: await hash.make('oldPassword123')
    })

    const token = crypto.randomBytes(32).toString('hex')
    const resetToken = await PasswordResetToken.create({
      email: user.email,
      token: hashToken(token),
      expiresAt: DateTime.now().plus({ hours: 1 })
    })

    const newPassword = 'NewSecurePassword123!'

    // Act
    const response = await client
      .post('/password/reset')
      .withCsrfToken()
      .json({
        token,
        password: newPassword,
        passwordConfirmation: newPassword
      })

    // Assert
    response.assertStatus(200)
    response.assertBodyContains({
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès'
    })

    // Vérifier que le mot de passe a été changé
    await user.refresh()
    assert.isTrue(await hash.verify(user.password!, newPassword))

    // Vérifier que le token a été marqué comme utilisé
    await resetToken.refresh()
    assert.isNotNull(resetToken.usedAt)
  })

  test('POST /password/reset - devrait valider la confirmation du mot de passe', async ({
    client
  }) => {
    // Arrange
    const token = crypto.randomBytes(32).toString('hex')
    await PasswordResetToken.create({
      email: 'user@example.com',
      token: hashToken(token),
      expiresAt: DateTime.now().plus({ hours: 1 })
    })

    // Act
    const response = await client
      .post('/password/reset')
      .withCsrfToken()
      .json({
        token,
        password: 'NewPassword123!',
        passwordConfirmation: 'DifferentPassword123!'
      })

    // Assert
    response.assertStatus(422)
    response.assertBodyContains({
      errors: [
        {
          field: 'passwordConfirmation'
        }
      ]
    })
  })

  test('POST /password/reset - devrait valider la longueur du mot de passe', async ({ client }) => {
    // Arrange
    const token = crypto.randomBytes(32).toString('hex')
    await PasswordResetToken.create({
      email: 'user@example.com',
      token: hashToken(token),
      expiresAt: DateTime.now().plus({ hours: 1 })
    })

    // Act
    const response = await client
      .post('/password/reset')
      .withCsrfToken()
      .json({
        token,
        password: 'short',
        passwordConfirmation: 'short'
      })

    // Assert
    response.assertStatus(422)
    response.assertBodyContains({
      errors: [
        {
          field: 'password'
        }
      ]
    })
  })

  test('POST /password/reset - devrait rejeter un token expiré', async ({ client }) => {
    // Arrange
    const token = crypto.randomBytes(32).toString('hex')
    await PasswordResetToken.create({
      email: 'user@example.com',
      token: hashToken(token),
      expiresAt: DateTime.now().minus({ hours: 1 })
    })

    // Act
    const response = await client
      .post('/password/reset')
      .withCsrfToken()
      .json({
        token,
        password: 'NewPassword123!',
        passwordConfirmation: 'NewPassword123!'
      })

    // Assert
    response.assertStatus(400)
    response.assertBodyContains({
      success: false,
      error: 'Ce lien de réinitialisation a expiré'
    })
  })
})