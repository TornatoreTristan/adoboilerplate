import { test } from '@japa/runner'
import User from '#users/models/user'
import Organization from '#organizations/models/organization'
import testUtils from '@adonisjs/core/services/test_utils'
import hash from '@adonisjs/core/services/hash'

test.group('Middleware - Organization Context', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('loads organization from session', async ({ client }) => {
    const user = await User.create({
      email: 'user@test.com',
      password: await hash.make('password123'),
    })

    const org1 = await Organization.create({
      name: 'First Org',
      slug: 'first-org',
    })
    const org2 = await Organization.create({
      name: 'Second Org',
      slug: 'second-org',
    })

    await user.related('organizations').attach({
      [org1.id]: { role: 'admin', joined_at: new Date() },
      [org2.id]: { role: 'member', joined_at: new Date() },
    })

    // Se connecter d'abord
    const loginResponse = await client.post('/auth/login').withCsrfToken().json({
      email: 'user@test.com',
      password: 'password123',
      rememberMe: false,
    })

    loginResponse.assertStatus(200)

    // Utiliser la session pour la requête suivante
    const response = await client
      .get('/debug/current-organization')
      .withSession(loginResponse.session())

    response.assertStatus(200)
    response.assertBodyContains({ id: org1.id, name: 'First Org' })
  })
})
