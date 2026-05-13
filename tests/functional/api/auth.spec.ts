import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserService from '#users/services/user_service'
import type OrganizationService from '#organizations/services/organization_service'
import type ApiTokenService from '#api/services/api_token_service'
import type ApiTokenRepository from '#api/repositories/api_token_repository'
import { API_SCOPES } from '#api/constants/api_scopes'
import type { CreateUserData } from '#shared/types/user'

async function bootstrapUser(email = 'api-auth@example.com') {
  const userService = getService<UserService>(TYPES.UserService)
  const orgService = getService<OrganizationService>(TYPES.OrganizationService)

  const userData: CreateUserData = { email, password: 'password123' }
  const user = await userService.create(userData)
  const organization = await orgService.create({ name: 'Test Org' }, user.id)

  return { user, organization }
}

async function generateToken(
  userId: string,
  organizationId: string,
  options: { scopes?: string[]; expiresAt?: Date } = {}
) {
  const service = getService<ApiTokenService>(TYPES.ApiTokenService)
  return service.generate({
    userId,
    organizationId,
    name: 'Test token',
    scopes: (options.scopes as never) ?? [API_SCOPES.USERS_READ],
    expiresAt: options.expiresAt ?? null,
  })
}

test.group('API authentication middleware', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('GET /api/v1/users/me without Authorization header returns 401', async ({ client }) => {
    const response = await client.get('/api/v1/users/me')
    response.assertStatus(401)
  })

  test('GET /api/v1/users/me with malformed header returns 401', async ({ client }) => {
    const response = await client
      .get('/api/v1/users/me')
      .header('Authorization', 'NotBearer something')

    response.assertStatus(401)
  })

  test('GET /api/v1/users/me with unknown token returns 401', async ({ client }) => {
    const response = await client
      .get('/api/v1/users/me')
      .header('Authorization', 'Bearer adobp_live_doesnotexist1234567890')

    response.assertStatus(401)
  })

  test('GET /api/v1/users/me with a valid token returns the user', async ({ client, assert }) => {
    const { user, organization } = await bootstrapUser()
    const token = await generateToken(user.id, organization.id)

    const response = await client
      .get('/api/v1/users/me')
      .header('Authorization', `Bearer ${token.plainToken}`)

    response.assertStatus(200)
    const body = response.body() as { data: { id: string; email: string } }
    assert.equal(body.data.id, user.id)
    assert.equal(body.data.email, user.email)
  })

  test('GET /api/v1/users/me with a revoked token returns 401', async ({ client }) => {
    const { user, organization } = await bootstrapUser('revoked-token@example.com')
    const token = await generateToken(user.id, organization.id)

    const service = getService<ApiTokenService>(TYPES.ApiTokenService)
    await service.revoke(token.id, user.id)

    const response = await client
      .get('/api/v1/users/me')
      .header('Authorization', `Bearer ${token.plainToken}`)

    response.assertStatus(401)
  })

  test('GET /api/v1/users/me with an expired token returns 401', async ({ client }) => {
    const { user, organization } = await bootstrapUser('expired-token@example.com')
    const token = await generateToken(user.id, organization.id, {
      expiresAt: DateTime.now().minus({ days: 1 }).toJSDate(),
    })

    const response = await client
      .get('/api/v1/users/me')
      .header('Authorization', `Bearer ${token.plainToken}`)

    response.assertStatus(401)
  })

  test('successful request updates last_used_at', async ({ client, assert }) => {
    const { user, organization } = await bootstrapUser('touch-last-used@example.com')
    const token = await generateToken(user.id, organization.id)

    const repo = getService<ApiTokenRepository>(TYPES.ApiTokenRepository)
    const before = await repo.findByIdOrFail(token.id)
    assert.isNull(before.lastUsedAt)

    await client.get('/api/v1/users/me').header('Authorization', `Bearer ${token.plainToken}`)

    // last_used_at is updated fire-and-forget; allow a tick for the promise to flush.
    await new Promise((resolve) => setTimeout(resolve, 50))

    const after = await repo.findByIdOrFail(token.id)
    assert.isNotNull(after.lastUsedAt)
  })
})
