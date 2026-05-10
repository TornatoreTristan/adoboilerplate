import { test } from '@japa/runner'
import AuditLogRepository from '#audit/repositories/audit_log_repository'
import AuditLog from '#audit/models/audit_log'
import User from '#users/models/user'
import Organization from '#organizations/models/organization'
import testUtils from '@adonisjs/core/services/test_utils'
import { AuditAction } from '#audit/types/audit'
import db from '@adonisjs/lucid/services/db'

test.group('AuditLogRepository', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  let user: User
  let organization: Organization

  group.each.setup(async () => {
    user = await User.create({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    })

    organization = await Organization.create({
      name: 'Test Org',
      slug: 'test-org',
    })
  })

  test('should create a new audit log entry', async ({ assert }) => {
    const repository = new AuditLogRepository()
    const logData = {
      userId: user.id,
      organizationId: organization.id,
      action: AuditAction.USER_CREATED,
      resourceType: 'User',
      resourceId: user.id,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      metadata: {
        email: 'test@example.com',
        fullName: 'Test User',
      },
    }

    const result = await repository.create(logData)

    assert.isObject(result)
    assert.equal(result.userId, logData.userId)
    assert.equal(result.organizationId, logData.organizationId)
    assert.equal(result.action, logData.action)
    assert.equal(result.resourceType, logData.resourceType)
    assert.equal(result.resourceId, logData.resourceId)
    assert.equal(result.ipAddress, logData.ipAddress)
    assert.deepEqual(result.metadata, logData.metadata)
    assert.isString(result.id)
  })

  test('should create an audit log without user (system action)', async ({ assert }) => {
    const repository = new AuditLogRepository()
    const logData = {
      userId: null,
      organizationId: null,
      action: 'system.maintenance',
      resourceType: null,
      resourceId: null,
      ipAddress: null,
      userAgent: null,
      metadata: {
        task: 'database cleanup',
      },
    }

    const result = await repository.create(logData)

    assert.isObject(result)
    assert.isNull(result.userId)
    assert.isNull(result.organizationId)
    assert.equal(result.action, logData.action)
  })

  test('should find audit logs by user ID', async ({ assert }) => {
    const repository = new AuditLogRepository()

    await AuditLog.create({
      userId: user.id,
      action: AuditAction.LOGIN_SUCCESS,
      ipAddress: '127.0.0.1',
    })

    await AuditLog.create({
      userId: user.id,
      action: AuditAction.USER_UPDATED,
      resourceType: 'User',
      resourceId: user.id,
    })

    const results = await repository.findByUser(user.id)

    assert.isArray(results)
    assert.lengthOf(results, 2)
    assert.equal(results[0].userId, user.id)
    assert.equal(results[1].userId, user.id)
  })

  test('should find audit logs by organization ID', async ({ assert }) => {
    const repository = new AuditLogRepository()

    await AuditLog.create({
      userId: user.id,
      organizationId: organization.id,
      action: AuditAction.ORGANIZATION_UPDATED,
      resourceType: 'Organization',
      resourceId: organization.id,
    })

    const results = await repository.findByOrganization(organization.id)

    assert.isArray(results)
    assert.lengthOf(results, 1)
    assert.equal(results[0].organizationId, organization.id)
  })

  test('should find audit logs by action', async ({ assert }) => {
    const repository = new AuditLogRepository()

    await AuditLog.create({
      userId: user.id,
      action: AuditAction.LOGIN_SUCCESS,
      ipAddress: '127.0.0.1',
    })

    await AuditLog.create({
      userId: user.id,
      action: AuditAction.LOGIN_SUCCESS,
      ipAddress: '192.168.1.1',
    })

    const results = await repository.findByAction(AuditAction.LOGIN_SUCCESS)

    assert.isArray(results)
    assert.lengthOf(results, 2)
    assert.equal(results[0].action, AuditAction.LOGIN_SUCCESS)
  })

  test('should find audit logs by resource', async ({ assert }) => {
    const repository = new AuditLogRepository()

    await AuditLog.create({
      userId: user.id,
      action: AuditAction.USER_UPDATED,
      resourceType: 'User',
      resourceId: user.id,
    })

    const results = await repository.findByResource('User', user.id)

    assert.isArray(results)
    assert.lengthOf(results, 1)
    assert.equal(results[0].resourceType, 'User')
    assert.equal(results[0].resourceId, user.id)
  })

  test('should search audit logs with full-text search', async ({ assert }) => {
    const repository = new AuditLogRepository()

    const log = await AuditLog.create({
      userId: user.id,
      action: 'user.profile.updated',
      resourceType: 'User',
      resourceId: user.id,
      metadata: {
        field: 'email',
        oldValue: 'old@example.com',
        newValue: 'new@example.com',
      },
    })

    // Manually update search_vector since trigger might not fire in tests
    await db.rawQuery(
      `UPDATE audit_logs SET search_vector =
        setweight(to_tsvector('french', COALESCE(action, '')), 'A') ||
        setweight(to_tsvector('french', COALESCE(resource_type, '')), 'B') ||
        setweight(to_tsvector('french', COALESCE(metadata::text, '')), 'C') ||
        setweight(to_tsvector('french', COALESCE(ip_address, '')), 'D')
      WHERE id = ?`,
      [log.id]
    )

    // PostgreSQL's lexer keeps dot-separated identifiers like
    // 'user.profile.updated' as a single token, so we search by a word that
    // really does end up in the index — `resource_type` ("User") tokenises
    // cleanly to 'user'.
    const results = await repository.search('user', 10)

    assert.isArray(results)
    assert.isAtLeast(results.length, 1)
  })

  test('should get audit log statistics', async ({ assert }) => {
    const repository = new AuditLogRepository()

    await AuditLog.create({ userId: user.id, action: AuditAction.LOGIN_SUCCESS })
    await AuditLog.create({ userId: user.id, action: AuditAction.LOGIN_SUCCESS })
    await AuditLog.create({ userId: user.id, action: AuditAction.LOGOUT })

    const stats = await repository.getStatistics()

    assert.isObject(stats)
    assert.equal(stats.totalLogs, 3)
    assert.equal(stats.uniqueUsers, 1)
    assert.isArray(stats.topActions)
    assert.isAtLeast(stats.topActions.length, 1)
    assert.equal(stats.topActions[0].action, AuditAction.LOGIN_SUCCESS)
    assert.equal(stats.topActions[0].count, 2)
  })

  test('should find audit logs with filters', async ({ assert }) => {
    const repository = new AuditLogRepository()

    await AuditLog.create({
      userId: user.id,
      organizationId: organization.id,
      action: AuditAction.USER_CREATED,
      resourceType: 'User',
      resourceId: user.id,
    })

    await AuditLog.create({
      userId: user.id,
      organizationId: organization.id,
      action: AuditAction.ORGANIZATION_UPDATED,
      resourceType: 'Organization',
      resourceId: organization.id,
    })

    const result = await repository.findWithFilters({
      organizationId: organization.id,
      limit: 10,
      offset: 0,
    })

    assert.isObject(result)
    assert.isArray(result.data)
    assert.lengthOf(result.data, 2)
    assert.isNumber(result.total)
    assert.equal(result.total, 2)
    assert.isBoolean(result.hasMore)
  })

  test('should get recent audit logs', async ({ assert }) => {
    const repository = new AuditLogRepository()

    await AuditLog.create({ userId: user.id, action: AuditAction.LOGIN_SUCCESS })
    await AuditLog.create({ userId: user.id, action: AuditAction.LOGOUT })

    const results = await repository.getRecent(7, 50)

    assert.isArray(results)
    assert.lengthOf(results, 2)
  })
})
