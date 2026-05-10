import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import hash from '@adonisjs/core/services/hash'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import { E } from '#shared/exceptions/index'
import type TwoFactorService from '#auth/services/two_factor_service'
import type UserRepository from '#users/repositories/user_repository'

const codeValidator = vine.compile(
  vine.object({
    code: vine.string().trim().minLength(6).maxLength(10),
  })
)

const disableValidator = vine.compile(
  vine.object({
    password: vine.string().minLength(1),
  })
)

/**
 * Endpoints for managing the user's own 2FA configuration.
 *
 * The login-time TOTP challenge is handled separately in AuthController.
 */
export default class TwoFactorController {
  /**
   * Begin 2FA setup: returns the secret + provisioning URI + QR code data
   * URL the frontend can render. The user is then expected to call
   * /auth/2fa/confirm with a code from their authenticator app.
   */
  async beginSetup({ user, response }: HttpContext) {
    E.assertUserExists(user)

    const twoFactorService = getService<TwoFactorService>(TYPES.TwoFactorService)
    if (twoFactorService.isEnabled(user)) {
      E.validationError("La 2FA est déjà activée. Désactivez-la d'abord pour la reconfigurer.")
    }

    const setup = await twoFactorService.beginSetup(user)
    return response.json({
      otpauthUrl: setup.otpauthUrl,
      qrCodeDataUrl: setup.qrCodeDataUrl,
      // Secret is also returned so the user can paste it manually if their
      // app can't scan QR codes — never store this server-side outside the
      // encrypted column on the user.
      secret: setup.secret,
    })
  }

  /**
   * Confirm setup with a TOTP code. Returns the one-time list of backup
   * codes — these are NOT shown anywhere else, so the frontend should
   * surface them prominently.
   */
  async confirmSetup({ request, user, response }: HttpContext) {
    E.assertUserExists(user)

    const { code } = await request.validateUsing(codeValidator)
    const twoFactorService = getService<TwoFactorService>(TYPES.TwoFactorService)

    const backupCodes = await twoFactorService.confirmSetup(user, code)
    return response.json({ enabled: true, backupCodes })
  }

  /**
   * Disable 2FA. Re-authenticates the user with their password rather than
   * a TOTP code so a lost device doesn't permanently lock them out.
   */
  async disable({ request, user, response }: HttpContext) {
    E.assertUserExists(user)

    const { password } = await request.validateUsing(disableValidator)
    if (!user.password) {
      E.invalidCredentials()
    }

    const valid = await hash.verify(user.password, password)
    if (!valid) {
      E.invalidCredentials()
    }

    const twoFactorService = getService<TwoFactorService>(TYPES.TwoFactorService)
    await twoFactorService.disable(user)

    return response.json({ enabled: false })
  }

  /**
   * Replace all existing backup codes with a fresh batch.
   */
  async regenerateBackupCodes({ user, response }: HttpContext) {
    E.assertUserExists(user)

    const twoFactorService = getService<TwoFactorService>(TYPES.TwoFactorService)
    const backupCodes = await twoFactorService.regenerateBackupCodes(user)
    return response.json({ backupCodes })
  }

  /**
   * Read the current state. Useful for the account-settings UI to decide
   * whether to render the setup wizard or the disable button.
   */
  async status({ user, response }: HttpContext) {
    E.assertUserExists(user)

    const twoFactorService = getService<TwoFactorService>(TYPES.TwoFactorService)
    return response.json({
      enabled: twoFactorService.isEnabled(user),
      confirmedAt: user.twoFactorConfirmedAt?.toISO() ?? null,
      remainingBackupCodes: user.twoFactorBackupCodes?.length ?? 0,
    })
  }

  /**
   * Login-time challenge endpoint. Called after the password step has set
   * `pending_2fa_user_id` in the session. Accepts either a TOTP code or
   * a single-use backup code.
   */
  async loginChallenge({ request, response, session }: HttpContext) {
    const { code } = await request.validateUsing(codeValidator)

    const pendingUserId = session.get('pending_2fa_user_id') as string | undefined
    if (!pendingUserId) {
      E.unauthorized('Aucune authentification en attente')
    }

    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const user = await userRepo.findById(pendingUserId)
    if (!user) {
      session.forget('pending_2fa_user_id')
      E.invalidCredentials()
    }

    const twoFactorService = getService<TwoFactorService>(TYPES.TwoFactorService)
    const ok =
      twoFactorService.verifyCode(user, code) ||
      (await twoFactorService.verifyBackupCode(user, code))

    if (!ok) {
      E.invalidCredentials('Code 2FA invalide')
    }

    session.regenerate()
    session.forget('pending_2fa_user_id')
    session.put('user_id', user.id)

    return response.json({ success: true })
  }
}
