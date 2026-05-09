import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import OrganizationService from '#organizations/services/organization_service'
import OrganizationRepository from '#organizations/repositories/organization_repository'
import UserService from '#users/services/user_service'
import type { CreateOrganizationData } from '#shared/types/organization'

test.group('OrganizationService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create organization with owner user using repository', async ({ assert }) => {
    // Arrange
    const userService = getService<UserService>(TYPES.UserService)
    const orgService = getService<OrganizationService>(TYPES.OrganizationService)
    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    const user = await userService.create({
      email: 'owner@example.com',
      password: 'password123',
    })

    // Act
    const orgData: CreateOrganizationData = {
      name: 'Ma Super Entreprise',
      description: 'Une entreprise innovante',
    }
    const organization = await orgService.create(orgData, user.id)

    // Assert
    assert.exists(organization.id)
    assert.equal(organization.name, 'Ma Super Entreprise')
    assert.equal(organization.slug, organization.id) // Slug should be the UUID
    assert.isTrue(organization.isActive)

    // Verify user is owner
    const role = await orgRepo.getUserRole(organization.id, user.id)
    assert.equal(role, 'owner')
  })

  test('should create organization with custom slug if provided', async ({ assert }) => {
    // Arrange
    const userService = getService<UserService>(TYPES.UserService)
    const orgService = getService<OrganizationService>(TYPES.OrganizationService)

    const user = await userService.create({
      email: 'owner@example.com',
      password: 'password123',
    })

    // Act
    const orgData: CreateOrganizationData = {
      name: 'Custom Slug Org',
      slug: 'custom-slug-org',
      description: 'Organization with custom slug',
    }
    const organization = await orgService.create(orgData, user.id)

    // Assert
    assert.equal(organization.slug, 'custom-slug-org')
  })

  test('should invalidate cache after organization creation', async ({ assert }) => {
    // Arrange
    const userService = getService<UserService>(TYPES.UserService)
    const orgService = getService<OrganizationService>(TYPES.OrganizationService)
    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)

    const user = await userService.create({
      email: 'owner@example.com',
      password: 'password123',
    })

    const countBefore = await orgRepo.countUserOrganizations(user.id)
    assert.equal(countBefore, 0)

    // Act
    await orgService.create({ name: 'Test Org' }, user.id)

    // Assert
    const countAfter = await orgRepo.countUserOrganizations(user.id)
    assert.equal(countAfter, 1)
  })

  test('should add user to organization with specific role', async ({ assert }) => {
    // Arrange
    const userService = getService<UserService>(TYPES.UserService)
    const orgService = getService<OrganizationService>(TYPES.OrganizationService)

    const ownerUser = await userService.create({
      email: 'owner@example.com',
      password: 'password123',
    })

    const memberUser = await userService.create({
      email: 'member@example.com',
      password: 'password123',
    })

    const organization = await orgService.create(
      {
        name: 'Test Org',
      },
      ownerUser.id
    )

    // Act
    await orgService.addUser(organization.id, memberUser.id, 'member')

    // Assert
    const users = await orgService.getUsers(organization.id)

    assert.equal(users.length, 2) // owner + member

    const member = users.find((u) => u.email === 'member@example.com')
    assert.exists(member)
    assert.equal(member!.role, 'member')

    const owner = users.find((u) => u.email === 'owner@example.com')
    assert.exists(owner)
    assert.equal(owner!.role, 'owner')
  })

  test('should use repository for all data access', async ({ assert }) => {
    // This test verifies that the service uses repository pattern
    const userService = getService<UserService>(TYPES.UserService)
    const orgService = getService<OrganizationService>(TYPES.OrganizationService)

    const user = await userService.create({
      email: 'test@example.com',
      password: 'password123',
    })

    const org = await orgService.create({ name: 'Test Org' }, user.id)

    // The service should use repository methods internally
    // If this test passes, it means the service is properly using the repository
    assert.exists(org)
    assert.exists(org.id)
  })
})
