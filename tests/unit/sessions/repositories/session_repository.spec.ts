import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type SessionRepository from '#sessions/repositories/session_repository'
import type UserRepository from '#users/repositories/user_repository'

async function createUser(email: string) {
  const repo = getService<UserRepository>(TYPES.UserRepository)
  return repo.create({ email, password: 'password123', fullName: email })
}

async function createSession(
  userId: string,
  opts: { startedAt?: DateTime; lastActivity?: DateTime } = {}
) {
  const repo = getService<SessionRepository>(TYPES.SessionRepository)
  return repo.create({
    userId,
    ipAddress: '127.0.0.1',
    userAgent: 'test',
    startedAt: opts.startedAt ?? DateTime.now(),
    lastActivity: opts.lastActivity ?? DateTime.now(),
    isActive: true,
  } as any)
}

test.group('SessionRepository - admin methods', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('countByDayStarted returns rows with date and count for sessions after the given date', async ({
    assert,
  }) => {
    const repo = getService<SessionRepository>(TYPES.SessionRepository)
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const user = await createUser('s1@x.com')

    const today = DateTime.now().startOf('day')
    const yesterday = today.minus({ days: 1 })
    const tenDaysAgo = today.minus({ days: 10 })

    const a = await createSession(user.id)
    await db.from('user_sessions').where('id', a.id).update({ started_at: yesterday.toJSDate() })

    const b = await createSession(user.id)
    await db.from('user_sessions').where('id', b.id).update({ started_at: yesterday.toJSDate() })

    const c = await createSession(user.id)
    await db.from('user_sessions').where('id', c.id).update({ started_at: tenDaysAgo.toJSDate() })

    const sinceDate = today.minus({ days: 5 }).toSQL()!
    const rows = await repo.countByDayStarted(sinceDate)

    const dayRow = rows.find((r) => r.date === yesterday.toISODate())
    assert.exists(dayRow)
    assert.isAtLeast(dayRow!.count, 2)

    const oldRow = rows.find((r) => r.date === tenDaysAgo.toISODate())
    assert.notExists(oldRow)
  })

  test('countDistinctActiveUserIds counts unique users with sessions after threshold', async ({
    assert,
  }) => {
    const repo = getService<SessionRepository>(TYPES.SessionRepository)
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const u1 = await createUser('s2@x.com')
    const u2 = await createUser('s3@x.com')
    const u3 = await createUser('s4@x.com')

    const recent = DateTime.now().minus({ hours: 1 })
    const old = DateTime.now().minus({ days: 60 })

    // u1: 2 recent sessions -> counts as 1
    const a = await createSession(u1.id)
    const b = await createSession(u1.id)
    await db
      .from('user_sessions')
      .whereIn('id', [a.id, b.id])
      .update({ last_activity: recent.toJSDate() })

    // u2: 1 recent session -> counts as 1
    const c = await createSession(u2.id)
    await db.from('user_sessions').where('id', c.id).update({ last_activity: recent.toJSDate() })

    // u3: only old sessions -> not counted
    const d = await createSession(u3.id)
    await db.from('user_sessions').where('id', d.id).update({ last_activity: old.toJSDate() })

    const threshold = DateTime.now().minus({ days: 30 }).toSQL()!
    const count = await repo.countDistinctActiveUserIds(threshold)

    assert.isAtLeast(count, 2)
  })

  test('getAverageSessionsPerUser computes average across users', async ({ assert }) => {
    const repo = getService<SessionRepository>(TYPES.SessionRepository)
    const u1 = await createUser('s5@x.com')
    const u2 = await createUser('s6@x.com')

    await createSession(u1.id)
    await createSession(u1.id)
    await createSession(u1.id)
    await createSession(u2.id)

    const avg = await repo.getAverageSessionsPerUser()
    assert.isAbove(avg, 0)
  })

  test('getLastActivityByUser returns a map of user_id to most recent last_activity', async ({
    assert,
  }) => {
    const repo = getService<SessionRepository>(TYPES.SessionRepository)
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const u1 = await createUser('s7@x.com')

    const earlier = DateTime.now().minus({ hours: 5 })
    const later = DateTime.now().minus({ hours: 1 })

    const a = await createSession(u1.id)
    await db.from('user_sessions').where('id', a.id).update({ last_activity: earlier.toJSDate() })

    const b = await createSession(u1.id)
    await db.from('user_sessions').where('id', b.id).update({ last_activity: later.toJSDate() })

    const map = await repo.getLastActivityByUser()

    assert.instanceOf(map, Map)
    assert.exists(map.get(u1.id))
    const stored = map.get(u1.id)!
    // The latest one should win (within a few seconds tolerance for DB rounding)
    const drift = Math.abs(stored.toMillis() - later.toMillis())
    assert.isBelow(drift, 2000, 'expected the most recent activity')
    assert.isAbove(stored.toMillis(), earlier.toMillis())
  })
})
