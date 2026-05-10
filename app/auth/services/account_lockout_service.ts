import { injectable } from 'inversify'
import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'

export interface LockoutStatus {
  locked: boolean
  failedAttempts: number
  /**
   * Seconds until the lockout window expires. -1 when no lockout window has
   * been opened yet (i.e. counter at 0 with no TTL).
   */
  ttlSeconds: number
}

const LOCKOUT_KEY_PREFIX = 'auth:lockout'
const ATTEMPTS_KEY_PREFIX = 'auth:lockout:attempts'

/**
 * Per-email lockout that lives next to the existing rate limit. The rate
 * limit caps how many login attempts a given email can issue inside a sliding
 * 15-minute window; this service goes further and locks the account
 * altogether after N consecutive *failed* attempts. Hitting the rate limit
 * doesn't trip the lockout — only credential rejections do.
 */
@injectable()
export default class AccountLockoutService {
  /**
   * Number of consecutive failed logins that will trigger a lockout.
   */
  static readonly MAX_FAILED_ATTEMPTS = 10

  /**
   * How long the lockout lasts once tripped (also the TTL of the failure
   * counter, so the slate is wiped after this long with no further attempts).
   */
  static readonly LOCKOUT_DURATION_SECONDS = 30 * 60

  private static normalize(email: string): string {
    return email.toLowerCase().trim()
  }

  private static lockoutKey(email: string): string {
    return `${LOCKOUT_KEY_PREFIX}:${AccountLockoutService.normalize(email)}`
  }

  private static attemptsKey(email: string): string {
    return `${ATTEMPTS_KEY_PREFIX}:${AccountLockoutService.normalize(email)}`
  }

  /**
   * Read the lockout state without mutating it. Use this before a login
   * attempt to short-circuit when the account is currently locked.
   */
  async getStatus(email: string): Promise<LockoutStatus> {
    const lockoutKey = AccountLockoutService.lockoutKey(email)
    const attemptsKey = AccountLockoutService.attemptsKey(email)

    const [lockedTtl, attemptsRaw] = await Promise.all([
      redis.ttl(lockoutKey),
      redis.get(attemptsKey),
    ])

    const failedAttempts = attemptsRaw ? Number.parseInt(attemptsRaw, 10) : 0
    const ttlSeconds = lockedTtl > 0 ? lockedTtl : await redis.ttl(attemptsKey)

    return {
      locked: lockedTtl > 0,
      failedAttempts,
      ttlSeconds,
    }
  }

  /**
   * Record a failed login. Returns the new state so the caller can decide
   * whether to reject the next attempt outright.
   */
  async recordFailure(email: string): Promise<LockoutStatus> {
    const attemptsKey = AccountLockoutService.attemptsKey(email)
    const lockoutKey = AccountLockoutService.lockoutKey(email)

    const failedAttempts = await redis.incr(attemptsKey)
    if (failedAttempts === 1) {
      await redis.expire(attemptsKey, AccountLockoutService.LOCKOUT_DURATION_SECONDS)
    }

    if (failedAttempts >= AccountLockoutService.MAX_FAILED_ATTEMPTS) {
      await redis.set(lockoutKey, '1', 'EX', AccountLockoutService.LOCKOUT_DURATION_SECONDS)
      logger.warn(
        { email: AccountLockoutService.normalize(email), failedAttempts },
        'Account lockout tripped'
      )
    }

    const ttlSeconds = await redis.ttl(attemptsKey)
    return {
      locked: failedAttempts >= AccountLockoutService.MAX_FAILED_ATTEMPTS,
      failedAttempts,
      ttlSeconds,
    }
  }

  /**
   * Wipe both counters on a successful login.
   */
  async reset(email: string): Promise<void> {
    await redis.del(
      AccountLockoutService.attemptsKey(email),
      AccountLockoutService.lockoutKey(email)
    )
  }
}
