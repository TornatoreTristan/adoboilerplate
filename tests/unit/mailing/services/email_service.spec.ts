import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type EmailService from '#mailing/services/email_service'
import type EmailLogRepository from '#mailing/repositories/email_log_repository'
import type UserRepository from '#users/repositories/user_repository'

test.group('EmailService - Logging', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create log when attempting to send email', async ({ assert }) => {
    const emailService = getService<EmailService>(TYPES.EmailService)
    const emailLogRepo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    await emailService.send({
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Hello World</p>',
      tags: { category: 'test' },
    })

    const logs = await emailLogRepo.findByCategory('test')

    assert.equal(logs.length, 1)
    assert.equal(logs[0].recipient, 'test@example.com')
    assert.equal(logs[0].subject, 'Test Email')
    assert.include(['sent', 'failed'], logs[0].status)
  })

  test('should create log with status=failed when email fails', async ({ assert }) => {
    const emailService = getService<EmailService>(TYPES.EmailService)
    const emailLogRepo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    await emailService.send({
      to: 'invalid-email-that-will-fail@',
      subject: 'Test Failure',
      html: '<p>This should fail</p>',
      tags: { category: 'test-fail' },
    })

    const logs = await emailLogRepo.findByCategory('test-fail')

    assert.equal(logs.length, 1)
    assert.equal(logs[0].status, 'failed')
    assert.isDefined(logs[0].errorMessage)
    assert.isNotNull(logs[0].failedAt)
  })

  test('should associate log with user when userId is provided', async ({ assert }) => {
    const emailService = getService<EmailService>(TYPES.EmailService)
    const emailLogRepo = getService<EmailLogRepository>(TYPES.EmailLogRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'user@example.com',
      password: 'password123',
      fullName: 'Test User',
    })

    await emailService.send(
      {
        to: user.email,
        subject: 'User Email',
        html: '<p>Hello User</p>',
        tags: { category: 'user-test' },
      },
      user.id
    )

    const logs = await emailLogRepo.findByUserId(user.id)

    assert.isAbove(logs.length, 0)
    const userLog = logs.find((log) => log.category === 'user-test')
    assert.isDefined(userLog)
    assert.equal(userLog!.userId, user.id)
  })

  test('should store metadata and attachments info in log', async ({ assert }) => {
    const emailService = getService<EmailService>(TYPES.EmailService)
    const emailLogRepo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    await emailService.send({
      to: 'test@example.com',
      subject: 'Email with metadata',
      html: '<p>Test</p>',
      tags: { category: 'metadata-test', campaign: 'launch' },
      cc: ['cc@example.com'],
      bcc: ['bcc@example.com'],
      attachments: [
        {
          filename: 'invoice.pdf',
          content: Buffer.from('fake-pdf-content'),
          contentType: 'application/pdf',
        },
      ],
    })

    const logs = await emailLogRepo.findByCategory('metadata-test')

    assert.equal(logs.length, 1)
    const log = logs[0]

    assert.isDefined(log.metadata)
    const metadata = log.metadata as { tags: { campaign: string }; cc: unknown; bcc: unknown }
    assert.equal(metadata.tags.campaign, 'launch')
    assert.isDefined(metadata.cc)
    assert.isDefined(metadata.bcc)

    assert.isDefined(log.attachmentsMetadata)
    assert.equal(log.attachmentsMetadata!.length, 1)
    assert.equal(log.attachmentsMetadata![0].filename, 'invoice.pdf')
    assert.equal(log.attachmentsMetadata![0].contentType, 'application/pdf')
  })

  test('should extract category from tags if provided', async ({ assert }) => {
    const emailService = getService<EmailService>(TYPES.EmailService)
    const emailLogRepo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    await emailService.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      tags: { category: 'welcome' },
    })

    const logs = await emailLogRepo.findByCategory('welcome')

    assert.equal(logs.length, 1)
    assert.equal(logs[0].category, 'welcome')
  })

  test('should use default category when tags.category is not provided', async ({ assert }) => {
    const emailService = getService<EmailService>(TYPES.EmailService)
    const emailLogRepo = getService<EmailLogRepository>(TYPES.EmailLogRepository)

    await emailService.send({
      to: 'test@example.com',
      subject: 'Test No Category',
      html: '<p>Test</p>',
    })

    const logs = await emailLogRepo.findAll()
    const uncategorized = logs.find((log) => log.subject === 'Test No Category')

    assert.isDefined(uncategorized)
    assert.equal(uncategorized!.category, 'general')
  })
})
