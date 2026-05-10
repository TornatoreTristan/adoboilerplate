import { injectable } from 'inversify'
import crypto from 'node:crypto'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'

export interface PasswordCheckResult {
  ok: boolean
  /** Translation-key-friendly reason code so callers can localise messaging. */
  reason?:
    | 'too_short'
    | 'too_long'
    | 'missing_lowercase'
    | 'missing_uppercase'
    | 'missing_digit'
    | 'missing_symbol'
    | 'pwned'
}

/**
 * Centralised password-policy enforcement.
 *
 * Default policy:
 *  - 12-128 chars,
 *  - at least one lowercase, one uppercase, one digit, one symbol,
 *  - not present in HIBP's pwned-passwords list (k-anonymity check, only
 *    the first 5 chars of the SHA-1 leave the host).
 *
 * The HIBP call is skipped when PWNED_PASSWORD_CHECK_ENABLED=false, when
 * NODE_ENV=test, or when the request fails (we fail-open so a third-party
 * outage doesn't lock new signups out — the local complexity rules still
 * apply).
 */
@injectable()
export default class PasswordStrengthService {
  static readonly MIN_LENGTH = 12
  static readonly MAX_LENGTH = 128

  async check(password: string): Promise<PasswordCheckResult> {
    if (password.length < PasswordStrengthService.MIN_LENGTH) {
      return { ok: false, reason: 'too_short' }
    }
    if (password.length > PasswordStrengthService.MAX_LENGTH) {
      return { ok: false, reason: 'too_long' }
    }
    if (!/[a-z]/.test(password)) return { ok: false, reason: 'missing_lowercase' }
    if (!/[A-Z]/.test(password)) return { ok: false, reason: 'missing_uppercase' }
    if (!/\d/.test(password)) return { ok: false, reason: 'missing_digit' }
    if (!/[^A-Za-z0-9]/.test(password)) return { ok: false, reason: 'missing_symbol' }

    if (await this.isPwned(password)) {
      return { ok: false, reason: 'pwned' }
    }

    return { ok: true }
  }

  /**
   * HIBP k-anonymity check: send only the first 5 characters of the SHA-1
   * to the HIBP range API and look for our suffix in the response.
   */
  async isPwned(password: string): Promise<boolean> {
    const enabled = env.get('PWNED_PASSWORD_CHECK_ENABLED', 'true') !== 'false'
    if (!enabled || env.get('NODE_ENV') === 'test') return false

    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
    const prefix = sha1.slice(0, 5)
    const suffix = sha1.slice(5)

    try {
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' },
        signal: AbortSignal.timeout(2000),
      })
      if (!response.ok) {
        logger.warn(
          { status: response.status },
          'HIBP pwned-passwords API returned non-ok — skipping check'
        )
        return false
      }
      const text = await response.text()
      return text.split('\n').some((line) => line.split(':')[0]?.trim().toUpperCase() === suffix)
    } catch (error) {
      logger.warn({ err: error }, 'HIBP pwned-passwords request failed — skipping check')
      return false
    }
  }
}
