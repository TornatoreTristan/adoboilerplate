import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { generateSync } from 'otplib'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type TwoFactorService from '#auth/services/two_factor_service'
import User from '#users/models/user'

test.group('TwoFactorService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('beginSetup writes a secret onto the user without enabling 2FA', async ({ assert }) => {
    const service = getService<TwoFactorService>(TYPES.TwoFactorService)
    const user = await User.create({
      email: 'twofa-setup@example.com',
      password: 'password123',
    })

    const result = await service.beginSetup(user)

    assert.isString(result.secret)
    assert.match(result.otpauthUrl, /^otpauth:\/\/totp\//)
    assert.match(result.qrCodeDataUrl, /^data:image\/png;base64,/)

    const refreshed = await User.findOrFail(user.id)
    assert.equal(refreshed.twoFactorSecret, result.secret)
    assert.isFalse(refreshed.twoFactorEnabled)
  })

  test('confirmSetup with a valid TOTP enables 2FA and emits backup codes', async ({ assert }) => {
    const service = getService<TwoFactorService>(TYPES.TwoFactorService)
    const user = await User.create({
      email: 'twofa-confirm@example.com',
      password: 'password123',
    })

    const setup = await service.beginSetup(user)
    const refreshed = await User.findOrFail(user.id)

    const code = generateSync({
      strategy: 'totp',
      secret: setup.secret,
    })

    const backupCodes = await service.confirmSetup(refreshed, code)

    assert.lengthOf(backupCodes, 8)
    backupCodes.forEach((c) => assert.match(c, /^[a-f0-9]{10}$/))

    const final = await User.findOrFail(user.id)
    assert.isTrue(final.twoFactorEnabled)
    assert.isNotNull(final.twoFactorConfirmedAt)
    // Stored values are hashes — never the raw codes returned to the user.
    assert.isFalse(final.twoFactorBackupCodes.includes(backupCodes[0]))
    assert.lengthOf(final.twoFactorBackupCodes, 8)
  })

  test('confirmSetup with a wrong code rejects without enabling', async ({ assert }) => {
    const service = getService<TwoFactorService>(TYPES.TwoFactorService)
    const user = await User.create({
      email: 'twofa-bad@example.com',
      password: 'password123',
    })

    await service.beginSetup(user)
    const refreshed = await User.findOrFail(user.id)

    await assert.rejects(() => service.confirmSetup(refreshed, '000000'))

    const final = await User.findOrFail(user.id)
    assert.isFalse(final.twoFactorEnabled)
  })

  test('verifyBackupCode consumes the matching code on success', async ({ assert }) => {
    const service = getService<TwoFactorService>(TYPES.TwoFactorService)
    const user = await User.create({
      email: 'twofa-backup@example.com',
      password: 'password123',
    })

    const setup = await service.beginSetup(user)
    const u1 = await User.findOrFail(user.id)
    const code = generateSync({ strategy: 'totp', secret: setup.secret })
    const backupCodes = await service.confirmSetup(u1, code)

    const u2 = await User.findOrFail(user.id)
    const used = await service.verifyBackupCode(u2, backupCodes[0])
    assert.isTrue(used)

    // Same code can't be reused.
    const u3 = await User.findOrFail(user.id)
    const reused = await service.verifyBackupCode(u3, backupCodes[0])
    assert.isFalse(reused)

    const final = await User.findOrFail(user.id)
    assert.lengthOf(final.twoFactorBackupCodes, 7)
  })

  test('disable wipes secret, codes and the enabled flag', async ({ assert }) => {
    const service = getService<TwoFactorService>(TYPES.TwoFactorService)
    const user = await User.create({
      email: 'twofa-disable@example.com',
      password: 'password123',
    })
    const setup = await service.beginSetup(user)
    const u1 = await User.findOrFail(user.id)
    const code = generateSync({ strategy: 'totp', secret: setup.secret })
    await service.confirmSetup(u1, code)

    const u2 = await User.findOrFail(user.id)
    await service.disable(u2)

    const final = await User.findOrFail(user.id)
    assert.isFalse(final.twoFactorEnabled)
    assert.isNull(final.twoFactorSecret)
    assert.lengthOf(final.twoFactorBackupCodes, 0)
    assert.isNull(final.twoFactorConfirmedAt)
  })
})
