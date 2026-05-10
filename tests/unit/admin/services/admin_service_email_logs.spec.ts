import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AdminService from '#admin/services/admin_service'
import type EmailLogRepository from '#mailing/repositories/email_log_repository'
import type UserRepository from '#users/repositories/user_repository'

test.group('AdminService - Email Logs', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should get email logs with pagination', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const emailLogRepo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    for (let i = 1; i <= 25; i++) {
      await emailLogRepo.create({
        recipient: `test${i}@example.com`,
        subject: `Email ${i}`,
        category: 'test',
        status: 'sent',
      })
    }

    const result = await adminService.getEmailLogs({ page: 1, perPage: 10 })

    assert.equal(result.data.length, 10)
    assert.equal(result.meta.total, 25)
    assert.equal(result.meta.currentPage, 1)
    assert.equal(result.meta.perPage, 10)
  })

  test('should filter email logs by status', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const emailLogRepo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    await emailLogRepo.create({
      recipient: 'sent@example.com',
      subject: 'Sent Email',
      category: 'test',
      status: 'sent',
    })

    await emailLogRepo.create({
      recipient: 'failed@example.com',
      subject: 'Failed Email',
      category: 'test',
      status: 'failed',
      errorMessage: 'Error',
    })

    await emailLogRepo.create({
      recipient: 'delivered@example.com',
      subject: 'Delivered Email',
      category: 'test',
      status: 'delivered',
    })

    const result = await adminService.getEmailLogs({ status: 'failed' })

    assert.equal(result.data.length, 1)
    assert.equal(result.data[0].status, 'failed')
  })

  test('should filter email logs by category', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const emailLogRepo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    await emailLogRepo.create({
      recipient: 'test@example.com',
      subject: 'Welcome Email',
      category: 'welcome',
      status: 'sent',
    })

    await emailLogRepo.create({
      recipient: 'test@example.com',
      subject: 'Password Reset',
      category: 'password-reset',
      status: 'sent',
    })

    await emailLogRepo.create({
      recipient: 'test@example.com',
      subject: 'Another Welcome',
      category: 'welcome',
      status: 'sent',
    })

    const result = await adminService.getEmailLogs({ category: 'welcome' })

    assert.equal(result.data.length, 2)
    assert.isTrue(result.data.every((log) => log.category === 'welcome'))
  })

  test('should filter email logs by recipient search', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const emailLogRepo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    await emailLogRepo.create({
      recipient: 'john@example.com',
      subject: 'Email 1',
      category: 'test',
      status: 'sent',
    })

    await emailLogRepo.create({
      recipient: 'jane@example.com',
      subject: 'Email 2',
      category: 'test',
      status: 'sent',
    })

    await emailLogRepo.create({
      recipient: 'john.doe@test.com',
      subject: 'Email 3',
      category: 'test',
      status: 'sent',
    })

    const result = await adminService.getEmailLogs({ search: 'john' })

    assert.equal(result.data.length, 2)
    assert.isTrue(result.data.every((log) => log.recipient.includes('john')))
  })

  test('should get email logs with user information', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const emailLogRepo = getService<EmailLogRepository>(TYPES.EmailLogRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'user@example.com',
      password: 'password123',
      fullName: 'Test User',
    })

    await emailLogRepo.create({
      userId: user.id,
      recipient: user.email,
      subject: 'User Email',
      category: 'welcome',
      status: 'sent',
    })

    const result = await adminService.getEmailLogs({})

    assert.equal(result.data.length, 1)
    assert.equal(result.data[0].userId, user.id)
  })

  test('should get email logs statistics', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const emailLogRepo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    await emailLogRepo.create({
      recipient: 'test1@example.com',
      subject: 'Email 1',
      category: 'welcome',
      status: 'sent',
    })

    await emailLogRepo.create({
      recipient: 'test2@example.com',
      subject: 'Email 2',
      category: 'password-reset',
      status: 'sent',
    })

    await emailLogRepo.create({
      recipient: 'test3@example.com',
      subject: 'Email 3',
      category: 'welcome',
      status: 'failed',
      errorMessage: 'Error',
    })

    const stats = await adminService.getEmailLogsStats()

    assert.isDefined(stats.total)
    assert.isDefined(stats.sent)
    assert.isDefined(stats.failed)
    assert.isDefined(stats.delivered)
    assert.isDefined(stats.byCategory)

    assert.equal(stats.total, 3)
    assert.isAbove(stats.byCategory.length, 0)
  })

  test('should combine multiple filters', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const emailLogRepo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    await emailLogRepo.create({
      recipient: 'test@example.com',
      subject: 'Welcome Email',
      category: 'welcome',
      status: 'sent',
    })

    await emailLogRepo.create({
      recipient: 'test@example.com',
      subject: 'Failed Welcome',
      category: 'welcome',
      status: 'failed',
      errorMessage: 'Error',
    })

    await emailLogRepo.create({
      recipient: 'other@example.com',
      subject: 'Reset Email',
      category: 'password-reset',
      status: 'sent',
    })

    const result = await adminService.getEmailLogs({
      category: 'welcome',
      status: 'sent',
      search: 'test',
    })

    assert.equal(result.data.length, 1)
    assert.equal(result.data[0].category, 'welcome')
    assert.equal(result.data[0].status, 'sent')
    assert.include(result.data[0].recipient, 'test')
  })
})
