import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserService from '#users/services/user_service'
import type UserRepository from '#users/repositories/user_repository'
import type OrganizationRepository from '#organizations/repositories/organization_repository'
import type { CreateUserData } from '#shared/types/user'

test.group('UsersController (account routes)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(async () => {
    const { default: redis } = await import('@adonisjs/redis/services/main')
    const keys = await redis.keys('ratelimit:*')
    if (keys.length > 0) await redis.del(...keys)
  })

  async function createUserWithOrganization(emailPrefix: string) {
    const userData: CreateUserData = {
      email: `${emailPrefix}-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Initial Name',
    }
    const userService = getService<UserService>(TYPES.UserService)
    const user = await userService.create(userData)

    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    await orgRepo.createWithOwner(
      { name: 'My Org', slug: `org-${emailPrefix}-${Date.now()}` },
      user.id
    )

    return user
  }

  test('PUT /account/profile updates the user fullName', async ({ client, assert }) => {
    const user = await createUserWithOrganization('profile-update')
    const login = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: user.email, password: 'password123' })

    const response = await client
      .put('/account/profile')
      .withCsrfToken()
      .withSession(login.session())
      .json({ fullName: 'Updated Name' })

    assert.include([200, 302, 303], response.status())

    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const fresh = await userRepo.findById(user.id)
    assert.equal(fresh!.fullName, 'Updated Name')
  })

  test('PUT /account/profile requires authentication', async ({ client }) => {
    const response = await client
      .put('/account/profile')
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ fullName: 'Updated Name' })

    response.assertStatus(401)
  })

  test('PUT /account/communication-preferences toggles user preferences', async ({
    client,
    assert,
  }) => {
    const user = await createUserWithOrganization('comm-prefs')
    const login = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: user.email, password: 'password123' })

    const response = await client
      .put('/account/communication-preferences')
      .withCsrfToken()
      .withSession(login.session())
      .json({
        newsletter_enabled: true,
        tips_enabled: false,
        promotional_offers_enabled: true,
      })

    response.assertStatus(200)

    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const fresh = await userRepo.findById(user.id)
    assert.isTrue(fresh!.newsletterEnabled)
    assert.isFalse(fresh!.tipsEnabled)
    assert.isTrue(fresh!.promotionalOffersEnabled)
  })
})
