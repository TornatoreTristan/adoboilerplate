import { test } from '@japa/runner'
import { configureStripeValidator } from '#admin/validators/configure_stripe_validator'

test.group('configureStripeValidator', () => {
  test('accepts a payload with just the required public key + active flag', async ({ assert }) => {
    const data = await configureStripeValidator.validate({
      publicKey: 'pk_test_xxx',
      isActive: true,
    })

    assert.equal(data.publicKey, 'pk_test_xxx')
    assert.isTrue(data.isActive)
    assert.isUndefined(data.secretKey)
    assert.isUndefined(data.webhookSecret)
  })

  test('accepts an inactive integration', async ({ assert }) => {
    const data = await configureStripeValidator.validate({
      publicKey: 'pk_live_xxx',
      isActive: false,
    })

    assert.isFalse(data.isActive)
  })

  test('rejects an empty public key', async ({ assert }) => {
    await assert.rejects(() =>
      configureStripeValidator.validate({
        publicKey: '',
        isActive: true,
      })
    )
  })

  test('rejects a non-boolean isActive', async ({ assert }) => {
    await assert.rejects(() =>
      configureStripeValidator.validate({
        publicKey: 'pk_xxx',
        isActive: 'yes',
      })
    )
  })

  test('rejects a payload missing isActive entirely', async ({ assert }) => {
    await assert.rejects(() =>
      configureStripeValidator.validate({
        publicKey: 'pk_xxx',
      })
    )
  })
})
