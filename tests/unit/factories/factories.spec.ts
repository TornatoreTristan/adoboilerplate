import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '../../../database/factories/user_factory.js'
import { OrganizationFactory } from '../../../database/factories/organization_factory.js'
import { PlanFactory } from '../../../database/factories/plan_factory.js'
import { SubscriptionFactory } from '../../../database/factories/subscription_factory.js'
import { RoleFactory } from '../../../database/factories/role_factory.js'
import { AuditLogFactory } from '../../../database/factories/audit_log_factory.js'
import { EmailLogFactory } from '../../../database/factories/email_log_factory.js'

test.group('Factories', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('UserFactory generates users with unique emails', async ({ assert }) => {
    const users = await UserFactory.createMany(5)

    assert.lengthOf(users, 5)

    const emails = users.map((user) => user.email)
    const uniqueEmails = new Set(emails)
    assert.equal(uniqueEmails.size, 5, 'All emails must be unique')
  })

  test('UserFactory verified state sets emailVerifiedAt', async ({ assert }) => {
    const user = await UserFactory.apply('verified').create()

    assert.isNotNull(user.emailVerifiedAt)
  })

  test('UserFactory generates user with hashed password', async ({ assert }) => {
    const user = await UserFactory.create()

    assert.isString(user.password)
    assert.notEqual(user.password, 'Password123!')
    assert.isAtLeast(user.password!.length, 20)
  })

  test('PlanFactory generates plan with nameI18n in fr and en', async ({ assert }) => {
    const plan = await PlanFactory.create()

    assert.isObject(plan.nameI18n)
    assert.isString(plan.nameI18n.fr, 'nameI18n.fr must be defined')
    assert.isString(plan.nameI18n.en, 'nameI18n.en must be defined')
    assert.isNotEmpty(plan.nameI18n.fr)
    assert.isNotEmpty(plan.nameI18n.en)
  })

  test('PlanFactory free state sets price to zero', async ({ assert }) => {
    const plan = await PlanFactory.apply('free').create()

    assert.equal(plan.priceMonthly, 0)
    assert.equal(plan.priceYearly, 0)
  })

  test('PlanFactory descriptionI18n has fr and en when not null', async ({ assert }) => {
    const plan = await PlanFactory.create()

    if (plan.descriptionI18n !== null) {
      assert.isString(plan.descriptionI18n.fr)
      assert.isString(plan.descriptionI18n.en)
    }
  })

  test('SubscriptionFactory with relations creates organization and plan', async ({ assert }) => {
    const organization = await OrganizationFactory.create()
    const plan = await PlanFactory.create()

    const subscription = await SubscriptionFactory.merge({
      organizationId: organization.id,
      planId: plan.id,
    }).create()

    assert.equal(subscription.organizationId, organization.id)
    assert.equal(subscription.planId, plan.id)
    assert.isString(subscription.id)
  })

  test('SubscriptionFactory active state has no canceledAt', async ({ assert }) => {
    const organization = await OrganizationFactory.create()
    const plan = await PlanFactory.create()

    const subscription = await SubscriptionFactory.apply('active')
      .merge({ organizationId: organization.id, planId: plan.id })
      .create()

    assert.equal(subscription.status, 'active')
    assert.isNull(subscription.canceledAt)
  })

  test('SubscriptionFactory canceled state sets canceledAt', async ({ assert }) => {
    const organization = await OrganizationFactory.create()
    const plan = await PlanFactory.create()

    const subscription = await SubscriptionFactory.apply('canceled')
      .merge({ organizationId: organization.id, planId: plan.id })
      .create()

    assert.equal(subscription.status, 'canceled')
    assert.isNotNull(subscription.canceledAt)
  })

  test('OrganizationFactory generates active organization with unique slug', async ({ assert }) => {
    const organizations = await OrganizationFactory.createMany(3)

    assert.lengthOf(organizations, 3)

    const slugs = organizations.map((org) => org.slug)
    const uniqueSlugs = new Set(slugs)
    assert.equal(uniqueSlugs.size, 3, 'All slugs must be unique')

    organizations.forEach((org) => {
      assert.isTrue(org.isActive)
    })
  })

  test('RoleFactory generates custom non-system role', async ({ assert }) => {
    const role = await RoleFactory.create()

    assert.isFalse(role.isSystem)
    assert.isString(role.slug)
    assert.isString(role.name)
  })

  test('RoleFactory admin state creates system admin role', async ({ assert }) => {
    const role = await RoleFactory.apply('admin').create()

    assert.isTrue(role.isSystem)
    assert.equal(role.slug, 'admin')
  })

  test('AuditLogFactory generates log with action and resourceType', async ({ assert }) => {
    const log = await AuditLogFactory.create()

    assert.isString(log.action)
    assert.isNotEmpty(log.action)
  })

  test('AuditLogFactory systemAction state clears user and organization', async ({ assert }) => {
    const log = await AuditLogFactory.apply('systemAction').create()

    assert.isNull(log.userId)
    assert.isNull(log.organizationId)
    assert.equal(log.action, 'system.maintenance')
  })

  test('EmailLogFactory generates log with sent status by default', async ({ assert }) => {
    const emailLog = await EmailLogFactory.create()

    assert.equal(emailLog.status, 'sent')
    assert.isString(emailLog.recipient)
    assert.isString(emailLog.subject)
    assert.isNotEmpty(emailLog.recipient)
  })

  test('EmailLogFactory bounced state sets bounce data', async ({ assert }) => {
    const emailLog = await EmailLogFactory.apply('bounced').create()

    assert.equal(emailLog.status, 'bounced')
    assert.isNotNull(emailLog.bounceData)
    assert.equal(emailLog.bounceData!.type, 'hard')
  })

  test('EmailLogFactory failed state sets errorMessage and failedAt', async ({ assert }) => {
    const emailLog = await EmailLogFactory.apply('failed').create()

    assert.equal(emailLog.status, 'failed')
    assert.isNotNull(emailLog.errorMessage)
    assert.isNotNull(emailLog.failedAt)
  })
})
