import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserService from '#users/services/user_service'
import type OrganizationService from '#organizations/services/organization_service'
import type ApiTokenService from '#api/services/api_token_service'
import { API_SCOPES, type ApiScope } from '#api/constants/api_scopes'
import type { CreateUserData } from '#shared/types/user'

async function bootstrap(email: string, scopes: ApiScope[]) {
  const userService = getService<UserService>(TYPES.UserService)
  const orgService = getService<OrganizationService>(TYPES.OrganizationService)

  const userData: CreateUserData = { email, password: 'password123' }
  const user = await userService.create(userData)
  const organization = await orgService.create({ name: 'Test Org' }, user.id)

  const tokenService = getService<ApiTokenService>(TYPES.ApiTokenService)
  const generated = await tokenService.generate({
    userId: user.id,
    organizationId: organization.id,
    name: 'Test token',
    scopes,
  })

  return { user, organization, token: generated }
}

test.group('API scope middleware', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('GET /api/v1/users/me requires users:read scope — returns 200 when present', async ({
    client,
  }) => {
    const { token } = await bootstrap('scope-ok@example.com', [API_SCOPES.USERS_READ])

    const response = await client
      .get('/api/v1/users/me')
      .header('Authorization', `Bearer ${token.plainToken}`)

    response.assertStatus(200)
  })

  test('GET /api/v1/users/me returns 403 when the token lacks users:read', async ({
    client,
    assert,
  }) => {
    const { token } = await bootstrap('scope-missing@example.com', [API_SCOPES.NOTIFICATIONS_READ])

    const response = await client
      .get('/api/v1/users/me')
      .header('Authorization', `Bearer ${token.plainToken}`)

    response.assertStatus(403)
    const body = response.body() as { code?: string; details?: { missing?: string[] } }
    assert.equal(body.code, 'API_INSUFFICIENT_SCOPE')
    assert.deepEqual(body.details?.missing, [API_SCOPES.USERS_READ])
  })
})
