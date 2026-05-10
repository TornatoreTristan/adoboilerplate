import factory from '@adonisjs/lucid/factories'
import { faker } from '@faker-js/faker'
import AuditLog from '#audit/models/audit_log'
import { AuditAction } from '#audit/types/audit'

const RESOURCE_TYPES = ['User', 'Organization', 'Subscription', 'Plan', 'Role', 'EmailLog']

export const AuditLogFactory = factory
  .define(AuditLog, async () => {
    const resourceType = faker.helpers.arrayElement(RESOURCE_TYPES)

    return {
      userId: null,
      organizationId: null,
      action: faker.helpers.arrayElement(Object.values(AuditAction)),
      resourceType,
      resourceId: faker.string.uuid(),
      ipAddress: faker.internet.ip(),
      userAgent: faker.internet.userAgent(),
      metadata: null,
    }
  })
  .state('withUser', (log) => {
    log.userId = faker.string.uuid()
  })
  .state('withOrganization', (log) => {
    log.organizationId = faker.string.uuid()
  })
  .state('withMetadata', (log) => {
    log.metadata = {
      changes: {
        field: faker.word.noun(),
        oldValue: faker.lorem.word(),
        newValue: faker.lorem.word(),
      },
      context: faker.lorem.sentence(),
    }
  })
  .state('loginAction', (log) => {
    log.action = AuditAction.LOGIN_SUCCESS
    log.resourceType = 'User'
  })
  .state('systemAction', (log) => {
    log.userId = null
    log.organizationId = null
    log.action = 'system.maintenance'
    log.resourceType = null
    log.resourceId = null
  })
  .build()
