import { test } from '@japa/runner'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type PasswordStrengthService from '#auth/services/password_strength_service'

test.group('PasswordStrengthService', () => {
  test('rejects passwords below the 12-char minimum', async ({ assert }) => {
    const service = getService<PasswordStrengthService>(TYPES.PasswordStrengthService)
    const result = await service.check('Aa1!short')
    assert.isFalse(result.ok)
    assert.equal(result.reason, 'too_short')
  })

  test('rejects passwords missing a lowercase letter', async ({ assert }) => {
    const service = getService<PasswordStrengthService>(TYPES.PasswordStrengthService)
    const result = await service.check('PASSWORD123!')
    assert.isFalse(result.ok)
    assert.equal(result.reason, 'missing_lowercase')
  })

  test('rejects passwords missing an uppercase letter', async ({ assert }) => {
    const service = getService<PasswordStrengthService>(TYPES.PasswordStrengthService)
    const result = await service.check('password123!')
    assert.isFalse(result.ok)
    assert.equal(result.reason, 'missing_uppercase')
  })

  test('rejects passwords missing a digit', async ({ assert }) => {
    const service = getService<PasswordStrengthService>(TYPES.PasswordStrengthService)
    const result = await service.check('PasswordOnly!')
    assert.isFalse(result.ok)
    assert.equal(result.reason, 'missing_digit')
  })

  test('rejects passwords missing a symbol', async ({ assert }) => {
    const service = getService<PasswordStrengthService>(TYPES.PasswordStrengthService)
    const result = await service.check('Password12345')
    assert.isFalse(result.ok)
    assert.equal(result.reason, 'missing_symbol')
  })

  test('accepts a password that meets the full policy', async ({ assert }) => {
    const service = getService<PasswordStrengthService>(TYPES.PasswordStrengthService)
    // NODE_ENV=test short-circuits the HIBP call, so the local rules are
    // the only thing this test depends on.
    const result = await service.check('Tr0ub4dor&3-NotPwned-Z9$')
    assert.isTrue(result.ok)
    assert.isUndefined(result.reason)
  })

  test('rejects passwords longer than 128 chars', async ({ assert }) => {
    const service = getService<PasswordStrengthService>(TYPES.PasswordStrengthService)
    const tooLong = 'A1!a'.repeat(40) // 160 chars
    const result = await service.check(tooLong)
    assert.isFalse(result.ok)
    assert.equal(result.reason, 'too_long')
  })
})
