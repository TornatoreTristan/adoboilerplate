import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import UserRepository from '#users/repositories/user_repository'

test.group('UserRepository - admin methods', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('countByDay returns rows with date and count for users after the given date', async ({ assert }) => {
    const repo = getService<UserRepository>(TYPES.UserRepository)
    const { default: db } = await import('@adonisjs/lucid/services/db')

    const today = DateTime.now().startOf('day')
    const yesterday = today.minus({ days: 1 })
    const tenDaysAgo = today.minus({ days: 10 })

    await repo.create({ email: 'a@x.com', password: 'pw', fullName: 'A' })
    await db.from('users').where('email', 'a@x.com').update({ created_at: yesterday.toJSDate() })

    await repo.create({ email: 'b@x.com', password: 'pw', fullName: 'B' })
    await db.from('users').where('email', 'b@x.com').update({ created_at: yesterday.toJSDate() })

    await repo.create({ email: 'c@x.com', password: 'pw', fullName: 'C' })
    await db.from('users').where('email', 'c@x.com').update({ created_at: tenDaysAgo.toJSDate() })

    const sinceDate = today.minus({ days: 5 }).toSQL()!
    const rows = await repo.countByDay(sinceDate)

    assert.isArray(rows)
    const dayRow = rows.find((r) => r.date === yesterday.toISODate())
    assert.exists(dayRow, 'expected a row for yesterday')
    assert.isAtLeast(dayRow!.count, 2)

    // older row should be excluded by the date filter
    const oldRow = rows.find((r) => r.date === tenDaysAgo.toISODate())
    assert.notExists(oldRow)
  })
})
