import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AdminService from '#admin/services/admin_service'
import type IntegrationRepository from '#integrations/repositories/integration_repository'

test.group('AdminService - Integrations', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should get all integrations with empty array initially', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const integrations = await adminService.getIntegrations()

    assert.isArray(integrations)
  })

  test('should configure Stripe integration with API keys', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)

    const stripeConfig = {
      publicKey: 'pk_test_123',
      secretKey: 'sk_test_456',
      webhookSecret: 'whsec_789',
    }

    const integration = await adminService.configureIntegration('stripe', stripeConfig, true)

    assert.exists(integration)
    assert.equal(integration.provider, 'stripe')
    assert.equal(integration.isActive, true)
    assert.deepEqual(integration.config, stripeConfig)
  })

  test('should update existing Stripe integration', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const integrationRepository = getService<IntegrationRepository>(TYPES.IntegrationRepository)

    await integrationRepository.create({
      provider: 'stripe',
      config: {
        publicKey: 'pk_test_old',
        secretKey: 'sk_test_old',
      },
      isActive: false,
    })

    const newConfig = {
      publicKey: 'pk_test_new',
      secretKey: 'sk_test_new',
      webhookSecret: 'whsec_new',
    }

    const updated = await adminService.configureIntegration('stripe', newConfig, true)

    assert.equal(updated.provider, 'stripe')
    assert.equal(updated.isActive, true)
    assert.equal(updated.config.publicKey, 'pk_test_new')
    assert.equal(updated.config.secretKey, 'sk_test_new')
  })

  test('should get specific integration by provider', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const integrationRepository = getService<IntegrationRepository>(TYPES.IntegrationRepository)

    await integrationRepository.create({
      provider: 'stripe',
      config: {
        publicKey: 'pk_test_123',
        secretKey: 'sk_test_456',
      },
      isActive: true,
    })

    const integration = await adminService.getIntegration('stripe')

    assert.exists(integration)
    assert.equal(integration!.provider, 'stripe')
    assert.equal(integration!.isActive, true)
    assert.equal(integration!.config.publicKey, 'pk_test_123')
  })

  test('should return null when integration does not exist', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const integration = await adminService.getIntegration('nonexistent')

    assert.isNull(integration)
  })

  test('should list all configured integrations', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const integrationRepository = getService<IntegrationRepository>(TYPES.IntegrationRepository)

    await integrationRepository.create({
      provider: 'stripe',
      config: { publicKey: 'pk_test' },
      isActive: true,
    })

    await integrationRepository.create({
      provider: 'paypal',
      config: { clientId: 'client_123' },
      isActive: false,
    })

    const integrations = await adminService.getIntegrations()

    assert.isArray(integrations)
    assert.isAtLeast(integrations.length, 2)

    const stripe = integrations.find((i) => i.provider === 'stripe')
    const paypal = integrations.find((i) => i.provider === 'paypal')

    assert.exists(stripe)
    assert.equal(stripe!.isActive, true)

    assert.exists(paypal)
    assert.equal(paypal!.isActive, false)
  })

  test('should deactivate an integration', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const integrationRepository = getService<IntegrationRepository>(TYPES.IntegrationRepository)

    await integrationRepository.create({
      provider: 'stripe',
      config: { publicKey: 'pk_test' },
      isActive: true,
    })

    const deactivated = await adminService.configureIntegration(
      'stripe',
      { publicKey: 'pk_test' },
      false
    )

    assert.equal(deactivated.isActive, false)
  })
})
