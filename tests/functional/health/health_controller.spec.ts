import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

const HEALTH_CHECK_TOKEN = 'test-health-token'

test.group('HealthController', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(() => {
    process.env.HEALTH_CHECK_TOKEN = HEALTH_CHECK_TOKEN
  })

  group.each.teardown(() => {
    delete process.env.HEALTH_CHECK_TOKEN
  })

  test('GET /health - should return minimal liveness status', async ({ client, assert }) => {
    const response = await client.get('/health')

    response.assertStatus(200)
    assert.property(response.body(), 'status')
    assert.equal(response.body().status, 'ok')
  })

  test('GET /health/ready - should return 401 without token', async ({ client }) => {
    const response = await client.get('/health/ready')

    response.assertStatus(401)
  })

  test('GET /health/ready - should return readiness status with valid token', async ({
    client,
    assert,
  }) => {
    const response = await client
      .get('/health/ready')
      .header('Authorization', `Bearer ${HEALTH_CHECK_TOKEN}`)

    response.assertStatus(200)
    assert.properties(response.body(), ['status', 'timestamp', 'uptime', 'checks'])
    assert.include(['ok', 'degraded', 'down'], response.body().status)
    assert.isString(response.body().timestamp)
    assert.isNumber(response.body().uptime)

    assert.properties(response.body().checks, ['database', 'redis'])

    const dbCheck = response.body().checks.database
    assert.properties(dbCheck, ['status'])
    assert.include(['ok', 'degraded', 'down'], dbCheck.status)

    const redisCheck = response.body().checks.redis
    assert.properties(redisCheck, ['status'])
    assert.include(['ok', 'degraded', 'down'], redisCheck.status)
  })

  test('GET /health/ready - should include latency in checks (with token)', async ({
    client,
    assert,
  }) => {
    const response = await client
      .get('/health/ready')
      .header('Authorization', `Bearer ${HEALTH_CHECK_TOKEN}`)

    response.assertStatus(200)

    const dbCheck = response.body().checks.database
    if (dbCheck.status === 'ok' || dbCheck.status === 'degraded') {
      assert.isNumber(dbCheck.latency)
      assert.isAtLeast(dbCheck.latency, 0)
    }

    const redisCheck = response.body().checks.redis
    if (redisCheck.status === 'ok' || redisCheck.status === 'degraded') {
      assert.isNumber(redisCheck.latency)
      assert.isAtLeast(redisCheck.latency, 0)
    }
  })

  test('GET /health/ready - should include details in checks (with token)', async ({
    client,
    assert,
  }) => {
    const response = await client
      .get('/health/ready')
      .header('Authorization', `Bearer ${HEALTH_CHECK_TOKEN}`)

    response.assertStatus(200)

    const dbCheck = response.body().checks.database
    if (dbCheck.status === 'ok' || dbCheck.status === 'degraded') {
      assert.isDefined(dbCheck.details)
    }

    const redisCheck = response.body().checks.redis
    if (redisCheck.status === 'ok' || redisCheck.status === 'degraded') {
      assert.isDefined(redisCheck.details)
    }
  })

  test('GET /health - should be fast (liveness)', async ({ client, assert }) => {
    const start = performance.now()
    const response = await client.get('/health')
    const duration = performance.now() - start

    response.assertStatus(200)
    assert.isBelow(duration, 100)
  })

  test('GET /health/ready - should complete within reasonable time (with token)', async ({
    client,
    assert,
  }) => {
    const start = performance.now()
    const response = await client
      .get('/health/ready')
      .header('Authorization', `Bearer ${HEALTH_CHECK_TOKEN}`)
    const duration = performance.now() - start

    response.assertStatus(200)
    assert.isBelow(duration, 1000)
  })
})
