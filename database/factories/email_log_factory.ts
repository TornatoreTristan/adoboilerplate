import factory from '@adonisjs/lucid/factories'
import { faker } from '@faker-js/faker'
import { DateTime } from 'luxon'
import EmailLog from '#mailing/models/email_log'
import type { EmailLogStatus } from '#mailing/models/email_log'

const EMAIL_CATEGORIES = [
  'transactional',
  'authentication',
  'notification',
  'marketing',
  'system',
  'invitation',
]

export const EmailLogFactory = factory
  .define(EmailLog, async () => {
    return {
      userId: null,
      recipient: faker.internet.email().toLowerCase(),
      subject: faker.lorem.sentence({ min: 3, max: 8 }),
      category: faker.helpers.arrayElement(EMAIL_CATEGORIES),
      status: 'sent' as EmailLogStatus,
      providerId: faker.string.uuid(),
      errorMessage: null,
      opensCount: 0,
      clicksCount: 0,
      openedAt: null,
      clickedAt: null,
      metadata: null,
      attachmentsMetadata: null,
      bounceData: null,
      complaintData: null,
      sentAt: DateTime.now().minus({ minutes: faker.number.int({ min: 1, max: 60 }) }),
      deliveredAt: DateTime.now().minus({ minutes: faker.number.int({ min: 0, max: 30 }) }),
      failedAt: null,
    }
  })
  .state('pending', (log) => {
    log.status = 'pending'
    log.providerId = null
    log.sentAt = null
    log.deliveredAt = null
  })
  .state('delivered', (log) => {
    log.status = 'delivered'
  })
  .state('opened', (log) => {
    log.status = 'opened'
    log.opensCount = faker.number.int({ min: 1, max: 10 })
    log.openedAt = DateTime.now().minus({ minutes: faker.number.int({ min: 1, max: 30 }) })
  })
  .state('clicked', (log) => {
    log.status = 'clicked'
    log.opensCount = faker.number.int({ min: 1, max: 5 })
    log.clicksCount = faker.number.int({ min: 1, max: 3 })
    log.openedAt = DateTime.now().minus({ minutes: faker.number.int({ min: 5, max: 60 }) })
    log.clickedAt = DateTime.now().minus({ minutes: faker.number.int({ min: 1, max: 5 }) })
  })
  .state('bounced', (log) => {
    log.status = 'bounced'
    log.sentAt = DateTime.now().minus({ minutes: 5 })
    log.deliveredAt = null
    log.bounceData = {
      type: 'hard',
      subType: 'General',
      message: 'The email address does not exist',
    }
  })
  .state('failed', (log) => {
    log.status = 'failed'
    log.providerId = null
    log.errorMessage = faker.lorem.sentence()
    log.sentAt = null
    log.deliveredAt = null
    log.failedAt = DateTime.now().minus({ minutes: faker.number.int({ min: 1, max: 60 }) })
  })
  .state('withAttachment', (log) => {
    log.attachmentsMetadata = [
      {
        filename: `${faker.system.fileName()}.pdf`,
        contentType: 'application/pdf',
        size: faker.number.int({ min: 1024, max: 5242880 }),
      },
    ]
  })
  .state('withUser', (log) => {
    log.userId = faker.string.uuid()
  })
  .build()
