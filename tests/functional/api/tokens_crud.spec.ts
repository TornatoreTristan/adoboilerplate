import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserService from '#users/services/user_service'
import type OrganizationService from '#organizations/services/organization_service'
import type ApiTokenRepository from '#api/repositories/api_token_repository'
import type ApiTokenService from '#api/services/api_token_service'
import { API_SCOPES } from '#api/constants/api_scopes'
import type { CreateUserData } from '#shared/types/user'

async function createUserWithOrg(email = 'token-owner@example.com') {
  const userService = getService<UserService>(TYPES.UserService)
  const orgService = getService<OrganizationService>(TYPES.OrganizationService)

  const userData: CreateUserData = { email, password: 'password123' }
  const user = await userService.create(userData)
  const organization = await orgService.create({ name: 'Test Org' }, user.id)

  return { user, organization }
}

test.group('Account API tokens CRUD', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('POST /account/api-tokens creates a token and returns the plain token once', async ({
    client,
    assert,
  }) => {
    const { user } = await createUserWithOrg()

    const response = await client
      .post('/account/api-tokens')
      .withSession({ user_id: user.id })
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({
        name: 'My integration',
        scopes: [API_SCOPES.USERS_READ],
      })

    response.assertStatus(201)
    const body = response.body() as {
      token: { id: string; name: string; prefix: string; plainToken: string; scopes: string[] }
    }

    assert.equal(body.token.name, 'My integration')
    assert.match(body.token.plainToken, /^adobp_live_/)
    assert.isTrue(body.token.plainToken.startsWith(body.token.prefix))
    assert.deepEqual(body.token.scopes, [API_SCOPES.USERS_READ])

    const repo = getService<ApiTokenRepository>(TYPES.ApiTokenRepository)
    const stored = await repo.findByIdOrFail(body.token.id)
    assert.notEqual(stored.tokenHash, body.token.plainToken)
    assert.lengthOf(stored.tokenHash, 64)
  })

  test('POST /account/api-tokens rejects empty scopes', async ({ client }) => {
    const { user } = await createUserWithOrg('empty-scopes@example.com')

    const response = await client
      .post('/account/api-tokens')
      .withSession({ user_id: user.id })
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ name: 'Bad token', scopes: [] })

    response.assertStatus(422)
  })

  test('POST /account/api-tokens rejects unknown scopes', async ({ client }) => {
    const { user } = await createUserWithOrg('bad-scope@example.com')

    const response = await client
      .post('/account/api-tokens')
      .withSession({ user_id: user.id })
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ name: 'Bad scope', scopes: ['unknown:scope'] })

    response.assertStatus(422)
  })

  test('DELETE /account/api-tokens/:id revokes the token', async ({ client, assert }) => {
    const { user, organization } = await createUserWithOrg('revoker@example.com')

    const service = getService<ApiTokenService>(TYPES.ApiTokenService)
    const generated = await service.generate({
      userId: user.id,
      organizationId: organization.id,
      name: 'To revoke',
      scopes: [API_SCOPES.USERS_READ],
    })

    const response = await client
      .delete(`/account/api-tokens/${generated.id}`)
      .withSession({ user_id: user.id })
      .withCsrfToken()
      .header('accept', 'application/json')

    response.assertStatus(200)

    const repo = getService<ApiTokenRepository>(TYPES.ApiTokenRepository)
    const stored = await repo.findByIdOrFail(generated.id)
    assert.isNotNull(stored.revokedAt)
    assert.isTrue(stored.isRevoked)
  })

  test('DELETE /account/api-tokens/:id rejects revoking another user’s token', async ({
    client,
  }) => {
    const { user: owner, organization } = await createUserWithOrg('owner@example.com')
    const { user: attacker } = await createUserWithOrg('attacker@example.com')

    const service = getService<ApiTokenService>(TYPES.ApiTokenService)
    const generated = await service.generate({
      userId: owner.id,
      organizationId: organization.id,
      name: 'Victim token',
      scopes: [API_SCOPES.USERS_READ],
    })

    const response = await client
      .delete(`/account/api-tokens/${generated.id}`)
      .withSession({ user_id: attacker.id })
      .withCsrfToken()
      .header('accept', 'application/json')

    response.assertStatus(403)
  })
})
