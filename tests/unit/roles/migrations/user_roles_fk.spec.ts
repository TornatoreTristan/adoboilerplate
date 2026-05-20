import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import User from '#users/models/user'

test.group('user_roles FK — role_slug references roles.slug', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('creating user_role with non-existent role_slug throws FK violation', async ({ assert }) => {
    const user = await User.create({
      email: `fk-test-${Date.now()}@example.com`,
      password: 'password123',
    })

    await assert.rejects(async () => {
      await db.table('user_roles').insert({
        user_id: user.id,
        role_slug: 'this-slug-does-not-exist',
        granted_at: new Date(),
      })
    })
  })
})
