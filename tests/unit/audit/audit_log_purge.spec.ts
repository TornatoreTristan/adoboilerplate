import { test } from '@japa/runner'
import AuditLogRepository from '#audit/repositories/audit_log_repository'
import AuditLogService from '#audit/services/audit_log_service'
import AuditLog from '#audit/models/audit_log'
import User from '#users/models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

test.group('AuditLog purge', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  let user: User

  group.each.setup(async () => {
    user = await User.create({
      email: 'purge-test@example.com',
      password: 'password123',
      fullName: 'Purge Test User',
    })
  })

  test('purgeOlderThan deletes rows older than cutoff and returns count', async ({ assert }) => {
    const repository = new AuditLogRepository()

    // Create 5 audit logs at various ages relative to today (2026-05-10)
    const ages = [100, 95, 50, 10, 0]
    for (const age of ages) {
      const log = await AuditLog.create({
        userId: user.id,
        action: `test.action.${age}`,
      })

      // Bypass ORM to set created_at directly via raw SQL
      await db.rawQuery('UPDATE audit_logs SET created_at = ? WHERE id = ?', [
        DateTime.now().minus({ days: age }).toSQL(),
        log.id,
      ])
    }

    const purged = await repository.purgeOlderThan(90)

    assert.equal(purged, 2)

    // Verify only 3 rows remain (50d, 10d, today)
    const remaining = await AuditLog.query().where('user_id', user.id)
    assert.lengthOf(remaining, 3)
  })

  test('purgeOlderThan(0) throws a validation exception', async ({ assert }) => {
    const repository = new AuditLogRepository()

    await assert.rejects(async () => {
      await repository.purgeOlderThan(0)
    })
  })

  test('purgeOlderThan(-1) throws a validation exception', async ({ assert }) => {
    const repository = new AuditLogRepository()

    await assert.rejects(async () => {
      await repository.purgeOlderThan(-1)
    })
  })

  test('purgeOldLogs uses AUDIT_LOG_RETENTION_DAYS env var when no override is given', async ({
    assert,
  }) => {
    const repository = new AuditLogRepository()
    const service = new AuditLogService(repository)

    // Create a log older than 90 days (the default)
    const log = await AuditLog.create({ userId: user.id, action: 'test.old' })
    await db.rawQuery('UPDATE audit_logs SET created_at = ? WHERE id = ?', [
      DateTime.now().minus({ days: 100 }).toSQL(),
      log.id,
    ])

    // Unset env override to rely on the 90-day default
    const originalEnv = process.env.AUDIT_LOG_RETENTION_DAYS
    delete process.env.AUDIT_LOG_RETENTION_DAYS

    const result = await service.purgeOldLogs()

    process.env.AUDIT_LOG_RETENTION_DAYS = originalEnv

    assert.equal(result.cutoffDays, 90)
    assert.isAtLeast(result.purged, 1)
  })

  test('purgeOldLogs respects daysOverride when provided', async ({ assert }) => {
    const repository = new AuditLogRepository()
    const service = new AuditLogService(repository)

    // Create a log 40 days old
    const log = await AuditLog.create({ userId: user.id, action: 'test.medium' })
    await db.rawQuery('UPDATE audit_logs SET created_at = ? WHERE id = ?', [
      DateTime.now().minus({ days: 40 }).toSQL(),
      log.id,
    ])

    // purge with override of 30 days — the 40-day-old log should be deleted
    const result = await service.purgeOldLogs(30)

    assert.equal(result.cutoffDays, 30)
    assert.isAtLeast(result.purged, 1)
  })
})
