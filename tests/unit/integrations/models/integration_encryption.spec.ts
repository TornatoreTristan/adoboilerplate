import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Integration from '#integrations/models/integration'
import db from '@adonisjs/lucid/services/db'

test.group('Integration - config encryption', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should store config encrypted (cannot read raw column as JSON)', async ({ assert }) => {
    const integration = await Integration.create({
      provider: `test-provider-${Date.now()}`,
      isActive: false,
      config: { apiKey: 'secret-key-123', webhookSecret: 'wh-secret' },
    })

    const raw = await db
      .from('integrations')
      .where('id', integration.id)
      .select('config')
      .firstOrFail()

    // The raw value must not be a valid JSON object — it is an encrypted string
    assert.isString(raw.config)
    let parsed: unknown
    try {
      parsed = JSON.parse(raw.config as string)
    } catch {
      parsed = null
    }
    // Either parse fails OR the result is a string (base64 ciphertext), not a plain object
    const isPlainObject = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
    assert.isFalse(isPlainObject, 'raw DB column should not contain a plain JSON object')
  })

  test('should round-trip config encryption (write then read returns identical object)', async ({
    assert,
  }) => {
    const original = { apiKey: 'sk_live_abc123', webhookSecret: 'wh_sec_xyz', port: 443 }

    const integration = await Integration.create({
      provider: `roundtrip-provider-${Date.now()}`,
      isActive: true,
      config: original,
    })

    const fetched = await Integration.findOrFail(integration.id)

    assert.deepEqual(fetched.config, original)
  })

  test('should return empty object if config is null in DB', async ({ assert }) => {
    // Insert a row bypassing the model to simulate a null config
    const provider = `null-config-provider-${Date.now()}`
    await db.table('integrations').insert({
      provider,
      is_active: false,
      config: null,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const fetched = await Integration.query().where('provider', provider).first()

    if (fetched) {
      assert.deepEqual(fetched.config, {})
    }
  })

  test('should return empty object if config is corrupted in DB', async ({ assert }) => {
    // Insert a row with garbage (simulates an accidentally corrupted ciphertext)
    await db.table('integrations').insert({
      provider: `corrupt-provider-${Date.now()}`,
      is_active: false,
      config: 'not-a-valid-ciphertext!!!',
      created_at: new Date(),
      updated_at: new Date(),
    })

    const fetched = await Integration.query()
      .where('provider', 'like', 'corrupt-provider-%')
      .orderBy('created_at', 'desc')
      .first()

    if (fetched) {
      assert.deepEqual(fetched.config, {})
    }
  })
})
