import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AdminService from '#admin/services/admin_service'
import type OrganizationRepository from '#organizations/repositories/organization_repository'
import type UserRepository from '#users/repositories/user_repository'

test.group('AdminService - Organizations', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should get all organizations with member count', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const organizationRepository = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    const org1 = await organizationRepository.create({
      name: 'Organization 1',
      slug: 'org-1',
      descriptionI18n: { fr: 'Première organisation', en: 'First organization' },
      isActive: true,
    })

    const org2 = await organizationRepository.create({
      name: 'Organization 2',
      slug: 'org-2',
      descriptionI18n: { fr: 'Deuxième organisation', en: 'Second organization' },
      isActive: false,
    })

    const { data: organizations, meta } = await adminService.getOrganizations(1, 50)

    assert.isArray(organizations)
    assert.isAtLeast(organizations.length, 2)
    assert.property(meta, 'total')
    assert.property(meta, 'perPage')
    assert.property(meta, 'currentPage')

    const foundOrg1 = organizations.find((org) => org.id === org1.id)
    const foundOrg2 = organizations.find((org) => org.id === org2.id)

    assert.exists(foundOrg1)
    assert.exists(foundOrg2)

    assert.equal(foundOrg1!.name, 'Organization 1')
    assert.equal(foundOrg1!.slug, 'org-1')
    assert.deepEqual(foundOrg1!.descriptionI18n, {
      fr: 'Première organisation',
      en: 'First organization',
    })
    assert.equal(foundOrg1!.isActive, true)
    assert.exists(foundOrg1!.createdAt)
    assert.property(foundOrg1!, 'membersCount')
    assert.isNumber(foundOrg1!.membersCount)
  })

  test('should return empty array when no organizations exist', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const { data: organizations } = await adminService.getOrganizations()
    assert.isArray(organizations)
  })

  test('should include member count for organizations', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const organizationRepository = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const { default: db } = await import('@adonisjs/lucid/services/db')

    const org = await organizationRepository.create({
      name: 'Test Org',
      slug: 'test-org',
      isActive: true,
    })

    const user1Id = crypto.randomUUID()
    const user2Id = crypto.randomUUID()

    await db.table('users').insert([
      {
        id: user1Id,
        email: 'user1@test.com',
        password: 'password',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: user2Id,
        email: 'user2@test.com',
        password: 'password',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])

    await db.table('user_organizations').insert([
      {
        id: crypto.randomUUID(),
        user_id: user1Id,
        organization_id: org.id,
        role: 'member',
        joined_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: crypto.randomUUID(),
        user_id: user2Id,
        organization_id: org.id,
        role: 'admin',
        joined_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])

    const { data: organizations } = await adminService.getOrganizations(1, 50)
    const foundOrg = organizations.find((o) => o.id === org.id)

    assert.exists(foundOrg)
    assert.equal(foundOrg!.membersCount, 2)
  })

  test('should return 0 member count for organization without members', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const organizationRepository = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    const org = await organizationRepository.create({
      name: 'Empty Org',
      slug: 'empty-org',
      isActive: true,
    })

    const { data: organizations } = await adminService.getOrganizations(1, 50)
    const foundOrg = organizations.find((o) => o.id === org.id)

    assert.exists(foundOrg)
    assert.equal(foundOrg!.membersCount, 0)
  })

  test('should get organization detail with members', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const organizationRepository = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const { default: db } = await import('@adonisjs/lucid/services/db')

    const org = await organizationRepository.create({
      name: 'Test Organization',
      slug: 'test-org',
      descriptionI18n: { fr: 'Une organisation de test', en: 'A test organization' },
      website: 'https://test.com',
      isActive: true,
    })

    const user1Id = crypto.randomUUID()
    const user2Id = crypto.randomUUID()

    await db.table('users').insert([
      {
        id: user1Id,
        email: 'admin@test.com',
        full_name: 'Admin User',
        password: 'password',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: user2Id,
        email: 'member@test.com',
        full_name: 'Member User',
        password: 'password',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])

    await db.table('user_organizations').insert([
      {
        id: crypto.randomUUID(),
        user_id: user1Id,
        organization_id: org.id,
        role: 'admin',
        joined_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: crypto.randomUUID(),
        user_id: user2Id,
        organization_id: org.id,
        role: 'member',
        joined_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])

    const detail = await adminService.getOrganizationDetail(org.id)

    assert.equal(detail.organization.id, org.id)
    assert.equal(detail.organization.name, 'Test Organization')
    assert.equal(detail.organization.slug, 'test-org')
    assert.deepEqual(detail.organization.descriptionI18n, {
      fr: 'Une organisation de test',
      en: 'A test organization',
    })
    assert.equal(detail.organization.website, 'https://test.com')
    assert.equal(detail.organization.isActive, true)
    assert.exists(detail.organization.createdAt)

    assert.isArray(detail.members)
    assert.equal(detail.members.length, 2)

    const adminMember = detail.members.find((m) => m.role === 'admin')
    const regularMember = detail.members.find((m) => m.role === 'member')

    assert.exists(adminMember)
    assert.equal(adminMember!.fullName, 'Admin User')
    assert.equal(adminMember!.email, 'admin@test.com')
    assert.exists(adminMember!.joinedAt)

    assert.exists(regularMember)
    assert.equal(regularMember!.fullName, 'Member User')
    assert.equal(regularMember!.email, 'member@test.com')
  })

  test('should get organization detail with no members', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const organizationRepository = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    const org = await organizationRepository.create({
      name: 'Empty Organization',
      slug: 'empty-org',
      isActive: true,
    })

    const detail = await adminService.getOrganizationDetail(org.id)

    assert.equal(detail.organization.id, org.id)
    assert.isArray(detail.members)
    assert.equal(detail.members.length, 0)
  })

  test('should throw error when organization not found', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const nonExistentId = crypto.randomUUID()

    await assert.rejects(() => adminService.getOrganizationDetail(nonExistentId))
  })

  test('should add existing user to organization', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const organizationRepository = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const userRepository = getService<UserRepository>(TYPES.UserRepository)

    const org = await organizationRepository.create({
      name: 'Test Org',
      slug: 'test-org',
      isActive: true,
    })

    const user = await userRepository.create({
      email: 'newmember@test.com',
      password: 'password123',
      fullName: 'New Member',
    })

    await adminService.addUserToOrganization(org.id, user.email, 'member')

    const detail = await adminService.getOrganizationDetail(org.id)

    assert.equal(detail.members.length, 1)
    assert.equal(detail.members[0].email, 'newmember@test.com')
    assert.equal(detail.members[0].role, 'member')
  })

  test('should throw error when adding non-existent user to organization', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const organizationRepository = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    const org = await organizationRepository.create({
      name: 'Test Org',
      slug: 'test-org',
      isActive: true,
    })

    await assert.rejects(
      () => adminService.addUserToOrganization(org.id, 'nonexistent@test.com', 'member'),
      /introuvable/
    )
  })

  test('should throw error when adding user already in organization', async ({ assert }) => {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const organizationRepository = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const userRepository = getService<UserRepository>(TYPES.UserRepository)
    const { default: db } = await import('@adonisjs/lucid/services/db')

    const org = await organizationRepository.create({
      name: 'Test Org',
      slug: 'test-org',
      isActive: true,
    })

    const user = await userRepository.create({
      email: 'member@test.com',
      password: 'password123',
      fullName: 'Existing Member',
    })

    await db.table('user_organizations').insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      organization_id: org.id,
      role: 'member',
      joined_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    })

    await assert.rejects(
      () => adminService.addUserToOrganization(org.id, user.email, 'admin'),
      'Cet utilisateur est déjà membre de cette organisation'
    )
  })
})
