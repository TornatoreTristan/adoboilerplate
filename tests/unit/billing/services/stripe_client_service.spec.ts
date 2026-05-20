import { test } from '@japa/runner'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type StripeClientService from '#billing/services/stripe_client_service'

test.group('StripeClientService - singleton', () => {
  test('should return the same Stripe instance on multiple calls', ({ assert }) => {
    const service = getService<StripeClientService>(TYPES.StripeClientService)

    const first = service.client
    const second = service.client

    assert.strictEqual(first, second, 'client getter must return the same instance each call')
  })

  test('should return two services that share the same Stripe instance', ({ assert }) => {
    const serviceA = getService<StripeClientService>(TYPES.StripeClientService)
    const serviceB = getService<StripeClientService>(TYPES.StripeClientService)

    assert.strictEqual(
      serviceA.client,
      serviceB.client,
      'singleton binding must produce identical Stripe instances'
    )
  })

  test('should expose a configured Stripe client with the expected api version', ({ assert }) => {
    const service = getService<StripeClientService>(TYPES.StripeClientService)

    const stripeClient = service.client

    assert.property(stripeClient, 'subscriptions', 'client should be a Stripe instance')
    assert.property(stripeClient, 'webhooks', 'client should expose webhooks namespace')
  })
})
