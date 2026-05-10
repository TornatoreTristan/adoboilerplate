import { test } from '@japa/runner'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AdminService from '#admin/services/admin_service'
import Role from '#roles/models/role'
import Permission from '#roles/models/permission'

test.group('AdminService - Roles', (group) => {
  let adminService: AdminService

  group.setup(() => {
    adminService = getService<AdminService>(TYPES.AdminService)
  })

  test('should get all roles with permissions count', async ({ assert }) => {
    const timestamp = Date.now()
    const role = await Role.create({
      name: `Test Role ${timestamp}`,
      slug: `test-role-${timestamp}`,
      description: 'Test role description',
      isSystem: false,
    })

    const permission1 = await Permission.create({
      name: `Test Permission 1 ${timestamp}`,
      slug: `test-permission-1-${timestamp}`,
      description: 'Test permission 1',
      resource: 'users',
      action: 'read',
    })

    const permission2 = await Permission.create({
      name: `Test Permission 2 ${timestamp}`,
      slug: `test-permission-2-${timestamp}`,
      description: 'Test permission 2',
      resource: 'users',
      action: 'write',
    })

    await role.related('permissions').attach([permission1.id, permission2.id])

    const roles = await adminService.getRoles()

    assert.isArray(roles)
    assert.isAtLeast(roles.length, 1)

    const testRole = roles.find((r) => r.id === role.id)
    assert.isDefined(testRole)
    assert.equal(testRole?.name, `Test Role ${timestamp}`)
    assert.equal(testRole?.slug, `test-role-${timestamp}`)
    assert.equal(testRole?.permissionsCount, 2)
  })

  test('should return empty array when no roles exist', async ({ assert, cleanup }) => {
    await Role.query().delete()
    cleanup(() => {})

    const roles = await adminService.getRoles()

    assert.isArray(roles)
    assert.lengthOf(roles, 0)
  })

  test('should differentiate system and custom roles', async ({ assert }) => {
    const timestamp = Date.now()
    const systemRole = await Role.create({
      name: `System Admin ${timestamp}`,
      slug: `system-admin-${timestamp}`,
      description: 'System administrator',
      isSystem: true,
    })

    const customRole = await Role.create({
      name: `Custom Role ${timestamp}`,
      slug: `custom-role-${timestamp}`,
      description: 'Custom role',
      isSystem: false,
    })

    const roles = await adminService.getRoles()

    const foundSystemRole = roles.find((r) => r.id === systemRole.id)
    const foundCustomRole = roles.find((r) => r.id === customRole.id)

    assert.isTrue(foundSystemRole?.isSystem)
    assert.isFalse(foundCustomRole?.isSystem)
  })

  test('should get role detail with permissions', async ({ assert }) => {
    const timestamp = Date.now()
    const role = await Role.create({
      name: `Manager ${timestamp}`,
      slug: `manager-${timestamp}`,
      description: 'Manager role',
      isSystem: false,
    })

    const permission1 = await Permission.create({
      name: `Edit Users ${timestamp}`,
      slug: `edit-users-${timestamp}`,
      description: 'Can edit users',
      resource: 'users',
      action: 'edit',
    })

    const permission2 = await Permission.create({
      name: `View Reports ${timestamp}`,
      slug: `view-reports-${timestamp}`,
      description: 'Can view reports',
      resource: 'reports',
      action: 'view',
    })

    await role.related('permissions').attach([permission1.id, permission2.id])

    const detail = await adminService.getRoleDetail(role.id)

    assert.equal(detail.role.id, role.id)
    assert.equal(detail.role.name, `Manager ${timestamp}`)
    assert.equal(detail.role.slug, `manager-${timestamp}`)
    assert.equal(detail.role.description, 'Manager role')
    assert.isFalse(detail.role.isSystem)
    assert.isArray(detail.permissions)
    assert.lengthOf(detail.permissions, 2)

    const editUsersPermission = detail.permissions.find((p) => p.slug === `edit-users-${timestamp}`)
    assert.isDefined(editUsersPermission)
    assert.equal(editUsersPermission?.name, `Edit Users ${timestamp}`)
  })

  test('should get role detail with no permissions', async ({ assert }) => {
    const timestamp = Date.now()
    const role = await Role.create({
      name: `Viewer ${timestamp}`,
      slug: `viewer-${timestamp}`,
      description: 'Viewer role',
      isSystem: false,
    })

    const detail = await adminService.getRoleDetail(role.id)

    assert.equal(detail.role.id, role.id)
    assert.isArray(detail.permissions)
    assert.lengthOf(detail.permissions, 0)
  })

  test('should throw error when role not found', async ({ assert }) => {
    await assert.rejects(() => adminService.getRoleDetail('00000000-0000-0000-0000-000000000000'))
  })
})
