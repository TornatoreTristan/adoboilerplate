import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserService from '#users/services/user_service'
import type UserRepository from '#users/repositories/user_repository'
import type OrganizationRepository from '#organizations/repositories/organization_repository'
import type { CreateUserData } from '#shared/types/user'

test.group('GdprController (account routes)', (group) => {
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
      fullName: 'GDPR Test User',
    }
    const userService = getService<UserService>(TYPES.UserService)
    const user = await userService.create(userData)

    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    await orgRepo.createWithOwner(
      { name: 'GDPR Org', slug: `org-${emailPrefix}-${Date.now()}` },
      user.id
    )

    return user
  }

  test('GET /account/data-export returns a JSON export of the user data', async ({
    client,
    assert,
  }) => {
    const user = await createUserWithOrganization('export')
    const login = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: user.email, password: 'password123' })

    const response = await client.get('/account/data-export').withSession(login.session())

    response.assertStatus(200)
    assert.match(response.header('content-type') ?? '', /application\/json/)
    assert.match(
      response.header('content-disposition') ?? '',
      /attachment; filename="my-data-.*\.json"/
    )

    const body = response.body()
    assert.equal(body.user.id, user.id)
    assert.equal(body.user.email, user.email)
    assert.isArray(body.organizations)
    assert.lengthOf(body.organizations, 1)
  })

  test('GET /account/data-export requires authentication', async ({ client }) => {
    const response = await client.get('/account/data-export').header('accept', 'application/json')
    response.assertStatus(401)
  })

  test('POST /account/delete-request schedules account deletion', async ({ client, assert }) => {
    const user = await createUserWithOrganization('delete-req')
    const login = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: user.email, password: 'password123' })

    const response = await client
      .post('/account/delete-request')
      .withCsrfToken()
      .withSession(login.session())
      .json({ reason: 'Privacy concerns' })

    assert.include([200, 302, 303], response.status())

    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const fresh = await userRepo.findById(user.id, { includeDeleted: true })
    assert.isNotNull(fresh!.deletedAt, 'user must be flagged for deletion (deletedAt set)')
  })

  test('POST /account/cancel-deletion clears the deletion flag', async ({ client, assert }) => {
    const user = await createUserWithOrganization('cancel-del')
    const login = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: user.email, password: 'password123' })

    // First schedule a deletion
    await client
      .post('/account/delete-request')
      .withCsrfToken()
      .withSession(login.session())
      .json({})

    // Then cancel it
    const response = await client
      .post('/account/cancel-deletion')
      .withCsrfToken()
      .withSession(login.session())

    assert.include([200, 302, 303], response.status())

    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const fresh = await userRepo.findById(user.id)
    assert.isNotNull(fresh, 'user must be accessible again after cancellation')
    assert.isNull(fresh!.deletedAt)
  })

  test('POST /account/delete-request requires authentication', async ({ client }) => {
    const response = await client
      .post('/account/delete-request')
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ reason: 'whatever' })

    response.assertStatus(401)
  })
})
