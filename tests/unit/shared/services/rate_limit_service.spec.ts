import { test } from '@japa/runner'
import RateLimitService from '#shared/services/rate_limit_service'
import type { RateLimitConfig } from '#shared/types/rate_limit'
import redis from '@adonisjs/redis/services/main'

test.group('RateLimitService', (group) => {
  let rateLimitService: RateLimitService

  group.setup(() => {
    rateLimitService = new RateLimitService()
  })

  group.each.teardown(async () => {
    await redis.flushdb()
  })

  test('should allow request when under limit', async ({ assert }) => {
    const config: RateLimitConfig = {
      maxRequests: 5,
      windowMs: 60000,
      strategy: 'ip',
    }
    const identifier = '192.168.1.1'

    const result = await rateLimitService.checkLimit(identifier, config)

    assert.isTrue(result.allowed)
    assert.equal(result.remaining, 4)
    assert.equal(result.total, 5)
    assert.instanceOf(result.resetAt, Date)
  })

  test('should block request when limit exceeded', async ({ assert }) => {
    const config: RateLimitConfig = {
      maxRequests: 3,
      windowMs: 60000,
      strategy: 'ip',
    }
    const identifier = '192.168.1.2'

    // Make 3 requests (should all pass)
    await rateLimitService.checkLimit(identifier, config)
    await rateLimitService.checkLimit(identifier, config)
    await rateLimitService.checkLimit(identifier, config)

    // 4th request should be blocked
    const result = await rateLimitService.checkLimit(identifier, config)

    assert.isFalse(result.allowed)
    assert.equal(result.remaining, 0)
  })

  test('should use sliding window algorithm', async ({ assert }) => {
    const config: RateLimitConfig = {
      maxRequests: 2,
      windowMs: 1000, // 1 second
      strategy: 'ip',
    }
    const identifier = '192.168.1.3'

    // Make 2 requests
    await rateLimitService.checkLimit(identifier, config)
    const secondResult = await rateLimitService.checkLimit(identifier, config)
    assert.equal(secondResult.remaining, 0)

    // Wait for window to pass
    await new Promise((resolve) => setTimeout(resolve, 1100))

    // Should allow request again
    const afterWindowResult = await rateLimitService.checkLimit(identifier, config)
    assert.isTrue(afterWindowResult.allowed)
    assert.equal(afterWindowResult.remaining, 1)
  })

  test('should use custom key prefix', async ({ assert }) => {
    const config: RateLimitConfig = {
      maxRequests: 5,
      windowMs: 60000,
      strategy: 'user',
      keyPrefix: 'login',
    }
    const identifier = 'user-123'

    const result = await rateLimitService.checkLimit(identifier, config)

    assert.isTrue(result.allowed)
    // Verify the key was created with custom prefix
    const keys = await redis.keys('ratelimit:login:*')
    assert.isNotEmpty(keys)
  })

  test('should handle concurrent requests correctly', async ({ assert }) => {
    const config: RateLimitConfig = {
      maxRequests: 10,
      windowMs: 60000,
      strategy: 'ip',
    }
    const identifier = '192.168.1.4'

    // Make 10 concurrent requests
    const promises = Array(10)
      .fill(null)
      .map(() => rateLimitService.checkLimit(identifier, config))

    const results = await Promise.all(promises)

    // All should be allowed
    assert.isTrue(results.every((r) => r.allowed))
    // Last one should have 0 remaining
    assert.isTrue(results.some((r) => r.remaining === 0))
  })

  test('should reset count after window expires', async ({ assert }) => {
    const config: RateLimitConfig = {
      maxRequests: 2,
      windowMs: 500,
      strategy: 'ip',
    }
    const identifier = '192.168.1.5'

    await rateLimitService.checkLimit(identifier, config)
    await rateLimitService.checkLimit(identifier, config)

    // Should be blocked
    const blockedResult = await rateLimitService.checkLimit(identifier, config)
    assert.isFalse(blockedResult.allowed)

    // Wait for reset
    await new Promise((resolve) => setTimeout(resolve, 600))

    // Should be allowed again with full quota
    const afterResetResult = await rateLimitService.checkLimit(identifier, config)
    assert.isTrue(afterResetResult.allowed)
    assert.equal(afterResetResult.remaining, 1)
  })

  test('should provide accurate resetAt timestamp', async ({ assert }) => {
    const config: RateLimitConfig = {
      maxRequests: 5,
      windowMs: 60000,
      strategy: 'ip',
    }
    const identifier = '192.168.1.6'
    const beforeRequest = Date.now()

    const result = await rateLimitService.checkLimit(identifier, config)

    const resetTimestamp = result.resetAt.getTime()
    const expectedReset = beforeRequest + config.windowMs

    // Allow 100ms tolerance
    assert.approximately(resetTimestamp, expectedReset, 100)
  })

  test('should handle different identifiers independently', async ({ assert }) => {
    const config: RateLimitConfig = {
      maxRequests: 2,
      windowMs: 60000,
      strategy: 'ip',
    }

    // Exhaust limit for first identifier
    await rateLimitService.checkLimit('192.168.1.7', config)
    await rateLimitService.checkLimit('192.168.1.7', config)
    const result1 = await rateLimitService.checkLimit('192.168.1.7', config)
    assert.isFalse(result1.allowed)

    // Second identifier should still have full quota
    const result2 = await rateLimitService.checkLimit('192.168.1.8', config)
    assert.isTrue(result2.allowed)
    assert.equal(result2.remaining, 1)
  })
})
