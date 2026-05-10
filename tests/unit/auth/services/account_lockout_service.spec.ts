import { test } from '@japa/runner'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import AccountLockoutService from '#auth/services/account_lockout_service'
import redis from '@adonisjs/redis/services/main'

test.group('AccountLockoutService', (group) => {
  group.each.setup(async () => {
    await redis.flushdb()
  })

  test('starts in an unlocked state with zero failed attempts', async ({ assert }) => {
    const service = getService<AccountLockoutService>(TYPES.AccountLockoutService)
    const status = await service.getStatus('fresh@example.com')

    assert.isFalse(status.locked)
    assert.equal(status.failedAttempts, 0)
  })

  test('accumulates failed attempts under MAX_FAILED_ATTEMPTS without locking', async ({
    assert,
  }) => {
    const service = getService<AccountLockoutService>(TYPES.AccountLockoutService)

    let last = await service.recordFailure('user@example.com')
    for (let i = 1; i < AccountLockoutService.MAX_FAILED_ATTEMPTS - 1; i++) {
      last = await service.recordFailure('user@example.com')
    }

    assert.isFalse(last.locked)
    assert.equal(last.failedAttempts, AccountLockoutService.MAX_FAILED_ATTEMPTS - 1)
  })

  test('locks the account once MAX_FAILED_ATTEMPTS is reached', async ({ assert }) => {
    const service = getService<AccountLockoutService>(TYPES.AccountLockoutService)

    let last
    for (let i = 0; i < AccountLockoutService.MAX_FAILED_ATTEMPTS; i++) {
      last = await service.recordFailure('locked@example.com')
    }

    assert.isTrue(last!.locked)
    assert.equal(last!.failedAttempts, AccountLockoutService.MAX_FAILED_ATTEMPTS)
    assert.isAtMost(last!.ttlSeconds, AccountLockoutService.LOCKOUT_DURATION_SECONDS)
    assert.isAbove(last!.ttlSeconds, 0)
  })

  test('reset clears both counters so the next attempt starts fresh', async ({ assert }) => {
    const service = getService<AccountLockoutService>(TYPES.AccountLockoutService)

    for (let i = 0; i < AccountLockoutService.MAX_FAILED_ATTEMPTS; i++) {
      await service.recordFailure('reset@example.com')
    }
    let status = await service.getStatus('reset@example.com')
    assert.isTrue(status.locked)

    await service.reset('reset@example.com')

    status = await service.getStatus('reset@example.com')
    assert.isFalse(status.locked)
    assert.equal(status.failedAttempts, 0)
  })

  test('treats emails case-insensitively', async ({ assert }) => {
    const service = getService<AccountLockoutService>(TYPES.AccountLockoutService)

    await service.recordFailure('Mixed@Example.com')
    const status = await service.getStatus('mixed@example.com')

    assert.equal(status.failedAttempts, 1)
  })
})
