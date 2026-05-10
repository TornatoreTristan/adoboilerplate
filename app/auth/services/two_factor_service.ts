import { injectable, inject } from 'inversify'
import { generateSecret, generateURI, verifySync } from 'otplib'
import QRCode from 'qrcode'
import crypto from 'node:crypto'
import { DateTime } from 'luxon'
import env from '#start/env'
import { TYPES } from '#shared/container/types'
import { E } from '#shared/exceptions/index'
import type UserRepository from '#users/repositories/user_repository'
import type User from '#users/models/user'

export interface TwoFactorSetup {
  secret: string
  otpauthUrl: string
  qrCodeDataUrl: string
}

const BACKUP_CODE_COUNT = 8
const BACKUP_CODE_BYTES = 5 // 10 hex chars per code

/**
 * TOTP (Google Authenticator-compatible) two-factor authentication.
 *
 * Setup happens in two steps so that an interrupted setup can't lock a user
 * out: `beginSetup` writes a fresh secret onto the user but leaves
 * `twoFactorEnabled = false`; `confirmSetup` validates the user-typed code
 * against that secret and only then flips the flag and issues backup codes.
 */
@injectable()
export default class TwoFactorService {
  constructor(@inject(TYPES.UserRepository) private userRepo: UserRepository) {}

  /**
   * The label that shows up in the authenticator app. Pulled from the env so
   * different environments (staging, prod) get distinguishable entries.
   */
  private appName(): string {
    return env.get('APP_NAME', 'My Application')
  }

  isEnabled(user: User): boolean {
    return user.twoFactorEnabled === true && user.twoFactorSecret !== null
  }

  /**
   * Generate a fresh secret + matching otpauth URL + QR code data URL. The
   * secret is persisted on the user so confirmSetup can verify against it.
   * Calling this on a user who already has 2FA enabled rotates the secret
   * but leaves the enabled flag untouched until they reconfirm.
   */
  async beginSetup(user: User): Promise<TwoFactorSetup> {
    const secret = generateSecret()
    const otpauthUrl = generateURI({
      strategy: 'totp',
      issuer: this.appName(),
      label: user.email,
      secret,
    })
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)

    await this.userRepo.update(user.id, {
      twoFactorSecret: secret,
    } as any)

    return { secret, otpauthUrl, qrCodeDataUrl }
  }

  /**
   * Verify a TOTP code against the user's stored secret and, on success, flip
   * the enabled flag and provision backup codes. Returns the backup codes
   * exactly once — they are stored hashed and shown nowhere else.
   */
  async confirmSetup(user: User, code: string): Promise<string[]> {
    if (!user.twoFactorSecret) {
      E.validationError('Aucune configuration 2FA en cours pour cet utilisateur', 'code')
    }

    const result = verifySync({
      strategy: 'totp',
      token: code,
      secret: user.twoFactorSecret,
      // Tolerate one 30-second step in either direction.
      epochTolerance: 1,
    })
    if (!result.valid) {
      E.validationError('Code de vérification invalide', 'code')
    }

    const backupCodes = TwoFactorService.generateBackupCodes()

    await this.userRepo.update(user.id, {
      twoFactorEnabled: true,
      twoFactorConfirmedAt: DateTime.now(),
      twoFactorBackupCodes: backupCodes.map(TwoFactorService.hashBackupCode),
    } as any)

    // Returned plaintext to the caller for one-time display; only the hashes
    // are persisted.
    return backupCodes
  }

  /**
   * Disable 2FA on the user. Caller is responsible for re-authenticating the
   * user (password / current TOTP code) before invoking this.
   */
  async disable(user: User): Promise<void> {
    await this.userRepo.update(user.id, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
      twoFactorConfirmedAt: null,
    } as any)
  }

  /**
   * Verify a TOTP code submitted at login (i.e. against an already-enabled
   * 2FA configuration).
   */
  verifyCode(user: User, code: string): boolean {
    if (!user.twoFactorEnabled || !user.twoFactorSecret) return false
    const result = verifySync({
      strategy: 'totp',
      token: code,
      secret: user.twoFactorSecret,
      epochTolerance: 1,
    })
    return result.valid
  }

  /**
   * Verify a backup code at login. Each backup code is single-use: a match
   * removes the corresponding hash from the user's stored list before
   * returning true.
   */
  async verifyBackupCode(user: User, code: string): Promise<boolean> {
    if (!user.twoFactorEnabled) return false

    const normalizedCode = code.replace(/\s+/g, '').toLowerCase()
    const incomingHash = TwoFactorService.hashBackupCode(normalizedCode)
    const stored = user.twoFactorBackupCodes ?? []
    const remaining = stored.filter((h) => h !== incomingHash)

    if (remaining.length === stored.length) {
      return false
    }

    await this.userRepo.update(user.id, {
      twoFactorBackupCodes: remaining,
    } as any)

    return true
  }

  /**
   * Generate a fresh batch of backup codes — destroys any previous codes.
   */
  async regenerateBackupCodes(user: User): Promise<string[]> {
    if (!user.twoFactorEnabled) {
      E.validationError('La 2FA doit être activée avant de générer des codes de secours', 'code')
    }
    const backupCodes = TwoFactorService.generateBackupCodes()
    await this.userRepo.update(user.id, {
      twoFactorBackupCodes: backupCodes.map(TwoFactorService.hashBackupCode),
    } as any)
    return backupCodes
  }

  private static generateBackupCodes(): string[] {
    return Array.from({ length: BACKUP_CODE_COUNT }, () =>
      crypto.randomBytes(BACKUP_CODE_BYTES).toString('hex')
    )
  }

  private static hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex')
  }
}
