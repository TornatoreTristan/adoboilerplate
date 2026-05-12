import { test } from '@japa/runner'
import { registerValidator } from '#auth/validators/register_validator'

test.group('registerValidator', () => {
  test('accepts a valid registration payload', async ({ assert }) => {
    const data = await registerValidator.validate({
      email: 'User@Example.com',
      password: 'a-very-long-password-12chars',
      confirmPassword: 'a-very-long-password-12chars',
      fullName: 'Jane Doe',
    })

    // Email is normalized + lowercased
    assert.equal(data.email, 'user@example.com')
    assert.equal(data.password, 'a-very-long-password-12chars')
    assert.equal(data.fullName, 'Jane Doe')
  })

  test('accepts a payload without fullName (optional)', async ({ assert }) => {
    const data = await registerValidator.validate({
      email: 'no-name@example.com',
      password: 'a-very-long-password-12chars',
      confirmPassword: 'a-very-long-password-12chars',
    })

    assert.isUndefined(data.fullName)
  })

  test('rejects an invalid email format', async ({ assert }) => {
    await assert.rejects(() =>
      registerValidator.validate({
        email: 'not-an-email',
        password: 'a-very-long-password-12chars',
        confirmPassword: 'a-very-long-password-12chars',
      })
    )
  })

  test('rejects a password shorter than 12 characters', async ({ assert }) => {
    await assert.rejects(() =>
      registerValidator.validate({
        email: 'short-pw@example.com',
        password: 'tooshort1',
        confirmPassword: 'tooshort1',
      })
    )
  })

  test('rejects a missing required field (no password)', async ({ assert }) => {
    await assert.rejects(() =>
      registerValidator.validate({
        email: 'no-pw@example.com',
        confirmPassword: 'a-very-long-password-12chars',
      })
    )
  })

  test('rejects a password longer than 128 characters', async ({ assert }) => {
    const longPassword = 'a'.repeat(129)
    await assert.rejects(() =>
      registerValidator.validate({
        email: 'long-pw@example.com',
        password: longPassword,
        confirmPassword: longPassword,
      })
    )
  })
})
