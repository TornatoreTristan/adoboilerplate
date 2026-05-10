import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import EmailLogRepository from '#mailing/repositories/email_log_repository'

test.group('EmailLogRepository - admin methods', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('findPaginatedWithFilters returns paginated logs', async ({ assert }) => {
    const repo = getService<EmailLogRepository>(TYPES.EmailLogRepository)
    for (let i = 1; i <= 25; i++) {
      await repo.create({
        recipient: `r${i}@x.com`,
        subject: `S ${i}`,
        category: 'test',
        status: 'sent',
      })
    }

    const result = await repo.findPaginatedWithFilters({ page: 1, perPage: 10 })

    assert.equal(result.data.length, 10)
    assert.isAtLeast(result.meta.total, 25)
    assert.equal(result.meta.currentPage, 1)
    assert.equal(result.meta.perPage, 10)
  })

  test('findPaginatedWithFilters filters by status', async ({ assert }) => {
    const repo = getService<EmailLogRepository>(TYPES.EmailLogRepository)
    await repo.create({ recipient: 'a@x.com', subject: 'A', category: 'cat', status: 'sent' })
    await repo.create({ recipient: 'b@x.com', subject: 'B', category: 'cat', status: 'failed', errorMessage: 'e' })

    const result = await repo.findPaginatedWithFilters({ status: 'failed' })

    assert.isTrue(result.data.every((log) => log.status === 'failed'))
  })

  test('findPaginatedWithFilters filters by category', async ({ assert }) => {
    const repo = getService<EmailLogRepository>(TYPES.EmailLogRepository)
    await repo.create({ recipient: 'a@x.com', subject: 'A', category: 'welcome', status: 'sent' })
    await repo.create({ recipient: 'b@x.com', subject: 'B', category: 'reset', status: 'sent' })

    const result = await repo.findPaginatedWithFilters({ category: 'welcome' })

    assert.isTrue(result.data.every((log) => log.category === 'welcome'))
  })

  test('findPaginatedWithFilters filters by recipient search', async ({ assert }) => {
    const repo = getService<EmailLogRepository>(TYPES.EmailLogRepository)
    await repo.create({ recipient: 'john@x.com', subject: 'A', category: 'cat', status: 'sent' })
    await repo.create({ recipient: 'jane@x.com', subject: 'B', category: 'cat', status: 'sent' })

    const result = await repo.findPaginatedWithFilters({ search: 'john' })

    assert.isTrue(result.data.every((log) => log.recipient.includes('john')))
  })

  test('getStatusCounts returns counts per status', async ({ assert }) => {
    const repo = getService<EmailLogRepository>(TYPES.EmailLogRepository)
    await repo.create({ recipient: 'x@x.com', subject: '1', category: 'cat', status: 'sent' })
    await repo.create({ recipient: 'x@x.com', subject: '2', category: 'cat', status: 'sent' })
    await repo.create({ recipient: 'x@x.com', subject: '3', category: 'cat', status: 'failed', errorMessage: 'e' })
    await repo.create({ recipient: 'x@x.com', subject: '4', category: 'cat', status: 'delivered' })
    await repo.create({ recipient: 'x@x.com', subject: '5', category: 'cat', status: 'pending' })

    const counts = await repo.getStatusCounts()

    assert.isAtLeast(counts.total, 5)
    assert.isAtLeast(counts.sent, 2)
    assert.isAtLeast(counts.failed, 1)
    assert.isAtLeast(counts.delivered, 1)
    assert.isAtLeast(counts.pending, 1)
  })
})
