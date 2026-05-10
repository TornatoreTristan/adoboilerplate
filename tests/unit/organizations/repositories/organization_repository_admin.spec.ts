import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type OrganizationRepository from '#organizations/repositories/organization_repository'
import type UserRepository from '#users/repositories/user_repository'

test.group('OrganizationRepository - admin methods', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('findPaginatedWithMemberCounts returns paginated orgs with their member counts', async ({
    assert,
  }) => {
    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const org1 = await orgRepo.create({ name: 'Org A', slug: 'org-a-pag', isActive: true } as any)
    const org2 = await orgRepo.create({ name: 'Org B', slug: 'org-b-pag', isActive: true } as any)

    const u1 = await userRepo.create({ email: 'p1@x.com', password: 'pw', fullName: 'P1' })
    const u2 = await userRepo.create({ email: 'p2@x.com', password: 'pw', fullName: 'P2' })

    await orgRepo.addUser(org1.id, u1.id, 'admin')
    await orgRepo.addUser(org1.id, u2.id, 'member')

    const { data, meta } = await orgRepo.findPaginatedWithMemberCounts(1, 50)

    assert.isArray(data)
    assert.isAtLeast(data.length, 2)
    assert.exists(meta.total)
    assert.equal(meta.perPage, 50)
    assert.equal(meta.currentPage, 1)

    const found1 = data.find((o) => o.id === org1.id)
    const found2 = data.find((o) => o.id === org2.id)
    assert.exists(found1)
    assert.exists(found2)
    assert.equal(found1!.membersCount, 2)
    assert.equal(found2!.membersCount, 0)
    assert.equal(found1!.name, 'Org A')
    assert.exists(found1!.createdAt)
  })

  test('getMembers returns members of an organization with their pivot role', async ({
    assert,
  }) => {
    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const org = await orgRepo.create({
      name: 'Members Org',
      slug: 'members-org',
      isActive: true,
    } as any)
    const admin = await userRepo.create({
      email: 'm-admin@x.com',
      password: 'pw',
      fullName: 'Admin',
    })
    const member = await userRepo.create({
      email: 'm-member@x.com',
      password: 'pw',
      fullName: 'Member',
    })

    await orgRepo.addUser(org.id, admin.id, 'admin')
    await orgRepo.addUser(org.id, member.id, 'member')

    const members = await orgRepo.getMembers(org.id)

    assert.equal(members.length, 2)
    const adminEntry = members.find((m) => m.email === 'm-admin@x.com')
    const memberEntry = members.find((m) => m.email === 'm-member@x.com')
    assert.exists(adminEntry)
    assert.exists(memberEntry)
    assert.equal(adminEntry!.role, 'admin')
    assert.equal(memberEntry!.role, 'member')
    assert.equal(adminEntry!.fullName, 'Admin')
    assert.exists(adminEntry!.joinedAt)
  })

  test('getMembers returns empty array for organization without members', async ({ assert }) => {
    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const org = await orgRepo.create({
      name: 'Lonely Org',
      slug: 'lonely-org',
      isActive: true,
    } as any)

    const members = await orgRepo.getMembers(org.id)

    assert.deepEqual(members, [])
  })
})
