import { test } from '@japa/runner'
import QueueService from '#shared/services/queue_service'
import { QueueNotFoundException } from '#shared/exceptions/domain_exceptions'

test.group('QueueService', (group) => {
  let queueService: QueueService

  group.each.setup(() => {
    queueService = new QueueService()
  })

  group.each.teardown(async () => {
    await queueService.closeAll()
  })

  test('listQueues returns empty array when no queues have been created', ({ assert }) => {
    const result = queueService.listQueues()
    assert.deepEqual(result, [])
  })

  test('listQueues returns registered queues after getQueue is called', ({ assert }) => {
    queueService.getQueue('test-queue')

    const result = queueService.listQueues()
    const names = result.map((q) => q.name)

    assert.include(names, 'test-queue')
  })

  test('listQueues marks dead-letter queues correctly', ({ assert }) => {
    queueService.getDeadLetterQueue('test-queue')

    const result = queueService.listQueues()
    const dlq = result.find((q) => q.name === 'test-queue:dead-letter')

    assert.isNotNull(dlq)
    assert.isTrue(dlq?.isDeadLetter)
  })

  test('listQueues returns both main and dead-letter queues', ({ assert }) => {
    queueService.getQueue('test-queue')
    queueService.getDeadLetterQueue('test-queue')

    const result = queueService.listQueues()

    const mainQueue = result.find((q) => q.name === 'test-queue' && !q.isDeadLetter)
    const dlq = result.find((q) => q.name === 'test-queue:dead-letter' && q.isDeadLetter)

    assert.isNotNull(mainQueue)
    assert.isNotNull(dlq)
  })

  test('registerKnownQueues instantiates the email queue', ({ assert }) => {
    queueService.registerKnownQueues()

    const result = queueService.listQueues()
    const names = result.map((q) => q.name)

    assert.include(names, 'email')
    assert.include(names, 'email:dead-letter')
  })

  test('getQueueStats throws QueueNotFoundException for unknown queue', async ({ assert }) => {
    await assert.rejects(() => queueService.getQueueStats('unknown-queue'), QueueNotFoundException)
  })

  test('getQueueStats returns counts for an instantiated queue', async ({ assert }) => {
    queueService.getQueue('stats-test-queue')

    const stats = await queueService.getQueueStats('stats-test-queue')

    assert.isNumber(stats.active)
    assert.isNumber(stats.waiting)
    assert.isNumber(stats.completed)
    assert.isNumber(stats.failed)
    assert.isNumber(stats.delayed)
    assert.isNumber(stats.paused)
  })

  test('retryFailedJob throws for non-existent job', async ({ assert }) => {
    queueService.getQueue('retry-test-queue')

    await assert.rejects(() =>
      queueService.retryFailedJob('retry-test-queue', 'non-existent-job-id')
    )
  })

  test('removeFailedJob throws for non-existent job', async ({ assert }) => {
    queueService.getQueue('remove-test-queue')

    await assert.rejects(() =>
      queueService.removeFailedJob('remove-test-queue', 'non-existent-job-id')
    )
  })

  test('pauseQueue and resumeQueue work on an instantiated queue', async ({ assert }) => {
    queueService.getQueue('pause-test-queue')

    await queueService.pauseQueue('pause-test-queue')
    const queue = queueService.getQueue('pause-test-queue')
    assert.isTrue(await queue.isPaused())

    await queueService.resumeQueue('pause-test-queue')
    assert.isFalse(await queue.isPaused())
  })
})
