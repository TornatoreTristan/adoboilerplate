import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type EmailLogRepository from '#mailing/repositories/email_log_repository'
import type UserRepository from '#users/repositories/user_repository'

test.group('EmailLogRepository', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create an email log', async ({ assert }) => {
    const repo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    const log = await repo.create({
      recipient: 'test@example.com',
      subject: 'Test Email',
      category: 'welcome',
      status: 'pending',
    })

    assert.equal(log.recipient, 'test@example.com')
    assert.equal(log.subject, 'Test Email')
    assert.equal(log.category, 'welcome')
    assert.equal(log.status, 'pending')
    assert.isUndefined(log.userId)
  })

  test('should create email log with user relation', async ({ assert }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const repo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    const user = await userRepo.create({
      email: 'user@example.com',
      password: 'password123',
      fullName: 'Test User',
    })

    const log = await repo.create({
      userId: user.id,
      recipient: user.email,
      subject: 'Welcome Email',
      category: 'welcome',
      status: 'sent',
      providerId: 're_abc123',
    })

    assert.equal(log.userId, user.id)
    assert.equal(log.providerId, 're_abc123')
  })

  test('should find logs by user id', async ({ assert }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const repo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    const user = await userRepo.create({
      email: 'user@example.com',
      password: 'password123',
    })

    await repo.create({
      userId: user.id,
      recipient: user.email,
      subject: 'Email 1',
      category: 'welcome',
      status: 'sent',
    })

    await repo.create({
      userId: user.id,
      recipient: user.email,
      subject: 'Email 2',
      category: 'password-reset',
      status: 'delivered',
    })

    await repo.create({
      recipient: 'other@example.com',
      subject: 'Email 3',
      category: 'welcome',
      status: 'sent',
    })

    const userLogs = await repo.findByUserId(user.id)

    assert.equal(userLogs.length, 2)
    assert.equal(userLogs[0].subject, 'Email 1')
    assert.equal(userLogs[1].subject, 'Email 2')
  })

  test('should filter logs by status', async ({ assert }) => {
    const repo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    await repo.create({
      recipient: 'test1@example.com',
      subject: 'Sent Email',
      category: 'welcome',
      status: 'sent',
    })

    await repo.create({
      recipient: 'test2@example.com',
      subject: 'Failed Email',
      category: 'welcome',
      status: 'failed',
      errorMessage: 'SMTP error',
    })

    await repo.create({
      recipient: 'test3@example.com',
      subject: 'Delivered Email',
      category: 'welcome',
      status: 'delivered',
    })

    const failedLogs = await repo.findByStatus('failed')

    assert.equal(failedLogs.length, 1)
    assert.equal(failedLogs[0].status, 'failed')
    assert.equal(failedLogs[0].errorMessage, 'SMTP error')
  })

  test('should filter logs by category', async ({ assert }) => {
    const repo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    await repo.create({
      recipient: 'test@example.com',
      subject: 'Welcome',
      category: 'welcome',
      status: 'sent',
    })

    await repo.create({
      recipient: 'test@example.com',
      subject: 'Reset Password',
      category: 'password-reset',
      status: 'sent',
    })

    await repo.create({
      recipient: 'test@example.com',
      subject: 'Another Welcome',
      category: 'welcome',
      status: 'delivered',
    })

    const welcomeLogs = await repo.findByCategory('welcome')

    assert.equal(welcomeLogs.length, 2)
    assert.isTrue(welcomeLogs.every((log) => log.category === 'welcome'))
  })

  test('should find logs with pagination', async ({ assert }) => {
    const repo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    for (let i = 1; i <= 25; i++) {
      await repo.create({
        recipient: `test${i}@example.com`,
        subject: `Email ${i}`,
        category: 'welcome',
        status: 'sent',
      })
    }

    const page1 = await repo.paginate(1, 10)
    const page2 = await repo.paginate(2, 10)

    assert.equal(page1.data.length, 10)
    assert.equal(page2.data.length, 10)
    assert.equal(page1.meta.total, 25)
    assert.equal(page1.meta.perPage, 10)
    assert.equal(page1.meta.currentPage, 1)
  })

  test('should get stats by category', async ({ assert }) => {
    const repo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    await repo.create({
      recipient: 'test@example.com',
      subject: 'Welcome 1',
      category: 'welcome',
      status: 'sent',
    })

    await repo.create({
      recipient: 'test@example.com',
      subject: 'Welcome 2',
      category: 'welcome',
      status: 'delivered',
    })

    await repo.create({
      recipient: 'test@example.com',
      subject: 'Reset',
      category: 'password-reset',
      status: 'sent',
    })

    const stats = await repo.getStatsByCategory()

    assert.isArray(stats)
    const welcomeStat = stats.find((s) => s.category === 'welcome')
    const resetStat = stats.find((s) => s.category === 'password-reset')

    assert.equal(welcomeStat?.count, 2)
    assert.equal(resetStat?.count, 1)
  })

  test('should update status with automatic timestamp', async ({ assert }) => {
    const repo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    const log = await repo.create({
      recipient: 'test@example.com',
      subject: 'Test',
      category: 'welcome',
      status: 'pending',
    })

    const updated = await repo.updateStatus(log.id, 'sent')

    assert.equal(updated.status, 'sent')
    assert.isNotNull(updated.sentAt)
  })

  test('should track opens and clicks', async ({ assert }) => {
    const repo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    const log = await repo.create({
      recipient: 'test@example.com',
      subject: 'Test',
      category: 'welcome',
      status: 'sent',
    })

    const opened = await repo.trackOpen(log.id)
    assert.equal(opened.opensCount, 1)
    assert.isNotNull(opened.openedAt)

    const clicked = await repo.trackClick(log.id)
    assert.equal(clicked.clicksCount, 1)
    assert.isNotNull(clicked.clickedAt)
  })

  test('should use model getters correctly', async ({ assert }) => {
    const repo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    const successLog = await repo.create({
      recipient: 'test@example.com',
      subject: 'Test',
      category: 'welcome',
      status: 'delivered',
    })

    const failedLog = await repo.create({
      recipient: 'test@example.com',
      subject: 'Test',
      category: 'welcome',
      status: 'failed',
      errorMessage: 'Error',
    })

    const withAttachments = await repo.create({
      recipient: 'test@example.com',
      subject: 'Test',
      category: 'welcome',
      status: 'sent',
      attachmentsMetadata: [
        { filename: 'invoice.pdf', contentType: 'application/pdf', size: 12345 },
      ],
    })

    assert.isTrue(successLog.isSuccess)
    assert.isFalse(successLog.isFailed)
    assert.isTrue(failedLog.isFailed)
    assert.isFalse(failedLog.isSuccess)
    assert.isTrue(withAttachments.hasAttachments)
    assert.isFalse(successLog.hasAttachments)
  })

  test('should find logs within date range', async ({ assert }) => {
    const repo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    const startDate = DateTime.now().minus({ days: 7 })
    const endDate = DateTime.now()

    await repo.create({
      recipient: 'test@example.com',
      subject: 'Recent Email',
      category: 'welcome',
      status: 'sent',
    })

    const recentLogs = await repo.findByDateRange(startDate, endDate)

    assert.isAbove(recentLogs.length, 0)
    const found = recentLogs.find((log) => log.subject === 'Recent Email')
    assert.isDefined(found)
  })
})
