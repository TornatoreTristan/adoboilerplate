import { injectable } from 'inversify'
import Bull from 'bull'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { E } from '#shared/exceptions/exception_helpers'

/**
 * Default retry policy applied to every queue obtained from this service.
 * Override per-job by passing your own JobOptions to {@link QueueService.add}.
 */
const DEFAULT_JOB_OPTIONS: Bull.JobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    // 5s, 10s, 20s, 40s, 80s — the last attempt fails ~2.5min after the first.
    delay: 5000,
  },
  // Garbage-collect successful jobs aggressively (keep the last 100 for
  // ops debugging). Failed jobs we keep longer so the DLQ has something to
  // chew on; cron jobs in the worker should drain old failures explicitly.
  removeOnComplete: { count: 100 },
  removeOnFail: false,
}

const DLQ_SUFFIX = ':dead-letter'

@injectable()
export default class QueueService {
  private queues: Map<string, Bull.Queue> = new Map()
  private deadLetterQueues: Map<string, Bull.Queue> = new Map()

  private redisOptions(): Bull.QueueOptions['redis'] {
    return {
      host: env.get('REDIS_HOST'),
      port: env.get('REDIS_PORT'),
      password: env.get('REDIS_PASSWORD'),
    }
  }

  /**
   * Get or create a queue. Newly-created queues get a `failed` listener
   * that pushes terminally-failed jobs (i.e. exhausted all attempts) onto
   * the matching dead-letter queue so they can be inspected and replayed
   * out-of-band rather than disappearing into a Bull `failed` set.
   */
  getQueue(name: string): Bull.Queue {
    if (!this.queues.has(name)) {
      const queue = new Bull(name, {
        redis: this.redisOptions(),
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      })

      queue.on('failed', async (job, err) => {
        const attemptsMade = job.attemptsMade
        const attemptsTotal = job.opts.attempts ?? DEFAULT_JOB_OPTIONS.attempts ?? 1
        if (attemptsMade < attemptsTotal) {
          logger.warn(
            { queue: name, jobId: job.id, jobName: job.name, attemptsMade, err: err.message },
            'Queued job failed — will retry'
          )
          return
        }
        logger.error(
          { queue: name, jobId: job.id, jobName: job.name, attemptsMade, err: err.message },
          'Queued job exhausted retries — moved to dead-letter'
        )
        try {
          const dlq = this.getDeadLetterQueue(name)
          await dlq.add(job.name, {
            originalJobId: job.id,
            originalQueue: name,
            data: job.data,
            failedReason: err.message,
            failedAt: new Date().toISOString(),
            stacktrace: job.stacktrace,
          })
        } catch (dlqError) {
          logger.error(
            { err: dlqError, queue: name, jobId: job.id },
            'Failed to enqueue dead-letter — original failure was not preserved'
          )
        }
      })

      this.queues.set(name, queue)
    }

    return this.queues.get(name)!
  }

  /**
   * Get or create the dead-letter queue paired with `name`. Jobs land here
   * once they've exhausted their retry budget; an operator (or a periodic
   * worker) can list and replay them.
   */
  getDeadLetterQueue(name: string): Bull.Queue {
    const dlqName = `${name}${DLQ_SUFFIX}`
    if (!this.deadLetterQueues.has(dlqName)) {
      const dlq = new Bull(dlqName, {
        redis: this.redisOptions(),
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: false,
          removeOnFail: false,
        },
      })
      this.deadLetterQueues.set(dlqName, dlq)
    }
    return this.deadLetterQueues.get(dlqName)!
  }

  /**
   * Add a job. Pass `options.jobId` (or rely on a stable id baked into
   * `data`) for idempotency — Bull deduplicates by jobId, so a retried
   * dispatch with the same id won't enqueue a duplicate.
   */
  async add(
    queueName: string,
    jobName: string,
    data: unknown,
    options?: Bull.JobOptions
  ): Promise<Bull.Job> {
    const queue = this.getQueue(queueName)
    return queue.add(jobName, data, options)
  }

  /**
   * Process jobs from queue. Wraps the handler with a logger so timing /
   * failure observability is consistent across queues.
   */
  process(queueName: string, jobName: string, handler: Bull.ProcessCallbackFunction<any>): void {
    const queue = this.getQueue(queueName)
    queue.process(jobName, async (job, done) => {
      const start = Date.now()
      try {
        await new Promise<void>((resolve, reject) => {
          handler(job, (err, result) => {
            if (err) reject(err)
            else resolve(result as void)
          })
        })
        const duration = Date.now() - start
        logger.debug({ queue: queueName, jobId: job.id, jobName, duration }, 'Queued job completed')
        done()
      } catch (err) {
        const duration = Date.now() - start
        logger.warn(
          {
            queue: queueName,
            jobId: job.id,
            jobName,
            duration,
            err: err instanceof Error ? err.message : err,
          },
          'Queued job threw — Bull retry will pick it up if attempts remain'
        )
        done(err instanceof Error ? err : new Error(String(err)))
      }
    })
  }

  /**
   * Replay a dead-lettered job back onto its original queue. Returns the
   * newly-created job id.
   */
  async replayDeadLetterJob(originalQueue: string, deadLetterJobId: Bull.JobId): Promise<Bull.Job> {
    const dlq = this.getDeadLetterQueue(originalQueue)
    const dead = await dlq.getJob(deadLetterJobId)
    if (!dead) {
      E.notFound('Dead-letter job', String(deadLetterJobId), {
        queue: `${originalQueue}${DLQ_SUFFIX}`,
      })
    }
    const replayed = await this.add(originalQueue, dead.name, dead.data?.data ?? dead.data)
    await dead.remove()
    return replayed
  }

  /**
   * Force-instantiate every queue that has a registered processor so that
   * the admin UI can list them even if no job has been enqueued yet during
   * this HTTP-server lifecycle.
   */
  registerKnownQueues(): void {
    const knownQueues = ['email']
    for (const name of knownQueues) {
      this.getQueue(name)
      this.getDeadLetterQueue(name)
    }
  }

  /**
   * List all queues that have been instantiated (main + dead-letter).
   */
  listQueues(): { name: string; isDeadLetter: boolean }[] {
    const result: { name: string; isDeadLetter: boolean }[] = []

    for (const name of this.queues.keys()) {
      result.push({ name, isDeadLetter: false })
    }

    for (const name of this.deadLetterQueues.keys()) {
      result.push({ name, isDeadLetter: true })
    }

    return result
  }

  /**
   * Return job counts for a queue. Throws if the queue has not been
   * instantiated.
   */
  async getQueueStats(name: string): Promise<{
    active: number
    waiting: number
    completed: number
    failed: number
    delayed: number
    paused: number
  }> {
    const queue = this.resolveQueue(name)
    const [counts, pausedCount] = await Promise.all([queue.getJobCounts(), queue.getPausedCount()])
    return {
      active: counts.active ?? 0,
      waiting: counts.waiting ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      paused: pausedCount ?? 0,
    }
  }

  /**
   * Return the most recent failed jobs (up to `limit`).
   */
  async getFailedJobs(
    name: string,
    limit: number = 50
  ): Promise<
    {
      id: Bull.JobId
      name: string
      data: unknown
      failedReason: string | undefined
      attemptsMade: number
      maxAttempts: number
      timestamp: number
      processedOn: number | undefined
      finishedOn: number | undefined
      stacktrace: string[]
    }[]
  > {
    const queue = this.resolveQueue(name)
    const jobs = await queue.getFailed(0, limit - 1)
    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      maxAttempts: (job.opts.attempts as number | undefined) ?? DEFAULT_JOB_OPTIONS.attempts ?? 1,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      stacktrace: job.stacktrace ?? [],
    }))
  }

  /**
   * Retry a specific failed job. Throws if the queue or job is not found.
   */
  async retryFailedJob(name: string, jobId: string): Promise<void> {
    const queue = this.resolveQueue(name)
    const job = await queue.getJob(jobId)
    if (!job) {
      E.queueJobNotFound(jobId, name)
    }
    await job.retry()
  }

  /**
   * Remove a specific failed job. Throws if the queue or job is not found.
   */
  async removeFailedJob(name: string, jobId: string): Promise<void> {
    const queue = this.resolveQueue(name)
    const job = await queue.getJob(jobId)
    if (!job) {
      E.queueJobNotFound(jobId, name)
    }
    await job.remove()
  }

  /**
   * Pause a queue (new jobs are dequeued but not processed).
   */
  async pauseQueue(name: string): Promise<void> {
    const queue = this.resolveQueue(name)
    await queue.pause()
  }

  /**
   * Resume a paused queue.
   */
  async resumeQueue(name: string): Promise<void> {
    const queue = this.resolveQueue(name)
    await queue.resume()
  }

  /**
   * Resolve an instantiated queue by name (main or dead-letter).
   * Throws `QueueNotFoundException` when not found so the caller never gets
   * a silently-created empty queue.
   */
  private resolveQueue(name: string): Bull.Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!
    }
    if (this.deadLetterQueues.has(name)) {
      return this.deadLetterQueues.get(name)!
    }
    E.queueNotFound(name)
  }

  /**
   * Close every Bull connection cleanly. Call this from the AdonisJS
   * shutdown hook so the worker process terminates without dangling
   * Redis sockets.
   */
  async closeAll(): Promise<void> {
    await Promise.all(
      [...this.queues.values(), ...this.deadLetterQueues.values()].map((q) => q.close())
    )
    this.queues.clear()
    this.deadLetterQueues.clear()
  }
}
