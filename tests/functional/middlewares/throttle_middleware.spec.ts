import { test } from '@japa/runner'
import redis from '@adonisjs/redis/services/main'

test.group('ThrottleMiddleware', (group) => {
  group.each.teardown(async () => {
    await redis.flushdb()
  })

  test('should allow requests within rate limit', async ({ assert }) => {
    const { default: RateLimitService } = await import('#shared/services/rate_limit_service')
    const service = new RateLimitService()

    const result = await service.checkLimit('test-ip-1', {
      maxRequests: 5,
      windowMs: 60000,
    })

    assert.isTrue(result.allowed)
    assert.equal(result.remaining, 4)
    assert.equal(result.total, 5)
  })

  test('should block requests exceeding rate limit', async ({ assert }) => {
    const { default: RateLimitService } = await import('#shared/services/rate_limit_service')
    const service = new RateLimitService()

    await service.checkLimit('test-ip-2', { maxRequests: 3, windowMs: 60000 })
    await service.checkLimit('test-ip-2', { maxRequests: 3, windowMs: 60000 })
    await service.checkLimit('test-ip-2', { maxRequests: 3, windowMs: 60000 })

    const result = await service.checkLimit('test-ip-2', { maxRequests: 3, windowMs: 60000 })

    assert.isFalse(result.allowed)
    assert.equal(result.remaining, 0)
  })

  test('should use IP address as default identifier', async ({ assert }) => {
    const { default: RateLimitService } = await import('#shared/services/rate_limit_service')
    const service = new RateLimitService()

    const result1 = await service.checkLimit('192.168.1.1', {
      maxRequests: 2,
      windowMs: 60000,
      strategy: 'ip',
    })
    const result2 = await service.checkLimit('192.168.1.1', {
      maxRequests: 2,
      windowMs: 60000,
      strategy: 'ip',
    })

    assert.isTrue(result1.allowed)
    assert.isTrue(result2.allowed)

    const result3 = await service.checkLimit('192.168.1.1', {
      maxRequests: 2,
      windowMs: 60000,
      strategy: 'ip',
    })
    assert.isFalse(result3.allowed)
  })

  test('should use authenticated user ID when strategy is user', async ({ assert }) => {
    const { default: RateLimitService } = await import('#shared/services/rate_limit_service')
    const service = new RateLimitService()

    const userId = 'user-123'

    const result1 = await service.checkLimit(userId, {
      maxRequests: 2,
      windowMs: 60000,
      strategy: 'user',
    })
    const result2 = await service.checkLimit(userId, {
      maxRequests: 2,
      windowMs: 60000,
      strategy: 'user',
    })

    assert.isTrue(result1.allowed)
    assert.isTrue(result2.allowed)

    const result3 = await service.checkLimit(userId, {
      maxRequests: 2,
      windowMs: 60000,
      strategy: 'user',
    })
    assert.isFalse(result3.allowed)
  })

  test('should apply global rate limit', async ({ assert }) => {
    const { default: RateLimitService } = await import('#shared/services/rate_limit_service')
    const service = new RateLimitService()

    await service.checkLimit('global', { maxRequests: 3, windowMs: 60000, strategy: 'global' })
    await service.checkLimit('global', { maxRequests: 3, windowMs: 60000, strategy: 'global' })
    await service.checkLimit('global', { maxRequests: 3, windowMs: 60000, strategy: 'global' })

    const result = await service.checkLimit('global', {
      maxRequests: 3,
      windowMs: 60000,
      strategy: 'global',
    })
    assert.isFalse(result.allowed)
  })

  test('should provide correct rate limit info', async ({ assert }) => {
    const { default: RateLimitService } = await import('#shared/services/rate_limit_service')
    const service = new RateLimitService()

    const result = await service.checkLimit('test-ip-3', {
      maxRequests: 10,
      windowMs: 60000,
    })

    assert.equal(result.total, 10)
    assert.equal(result.remaining, 9)
    assert.exists(result.resetAt)

    const resetTimestamp = result.resetAt.getTime()
    assert.isAbove(resetTimestamp, Date.now())
  })

  test('should include retry info when blocked', async ({ assert }) => {
    const { default: RateLimitService } = await import('#shared/services/rate_limit_service')
    const service = new RateLimitService()

    await service.checkLimit('test-ip-4', { maxRequests: 1, windowMs: 60000 })
    const result = await service.checkLimit('test-ip-4', { maxRequests: 1, windowMs: 60000 })

    assert.isFalse(result.allowed)
    assert.exists(result.resetAt)

    const retryAfterSeconds = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
    assert.isAbove(retryAfterSeconds, 0)
    assert.isBelow(retryAfterSeconds, 61)
  })

  test('should handle different routes independently', async ({ assert }) => {
    const { default: RateLimitService } = await import('#shared/services/rate_limit_service')
    const service = new RateLimitService()

    await service.checkLimit('test-ip-5', { maxRequests: 2, windowMs: 60000, keyPrefix: 'route1' })
    await service.checkLimit('test-ip-5', { maxRequests: 2, windowMs: 60000, keyPrefix: 'route1' })

    const result1 = await service.checkLimit('test-ip-5', {
      maxRequests: 2,
      windowMs: 60000,
      keyPrefix: 'route1',
    })
    assert.isFalse(result1.allowed)

    const result2 = await service.checkLimit('test-ip-5', {
      maxRequests: 2,
      windowMs: 60000,
      keyPrefix: 'route2',
    })
    assert.isTrue(result2.allowed)
  })

  test('should reset after window expires', async ({ assert }) => {
    const { default: RateLimitService } = await import('#shared/services/rate_limit_service')
    const service = new RateLimitService()

    const result1 = await service.checkLimit('test-ip-6', { maxRequests: 1, windowMs: 500 })
    assert.isTrue(result1.allowed)

    const result2 = await service.checkLimit('test-ip-6', { maxRequests: 1, windowMs: 500 })
    assert.isFalse(result2.allowed)

    // Real wait required: rate-limit uses Redis TTL based on wall-clock time,
    // so fake timers won't help. Window is 500 ms, we wait 600 ms.
    await new Promise((resolve) => setTimeout(resolve, 600))

    const result3 = await service.checkLimit('test-ip-6', { maxRequests: 1, windowMs: 500 })
    assert.isTrue(result3.allowed)
  })
})
