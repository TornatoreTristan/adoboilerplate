import { injectable } from 'inversify'
import Bull from 'bull'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

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
    data: any,
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
      throw new Error(
        `Dead-letter job ${deadLetterJobId} not found in ${originalQueue}${DLQ_SUFFIX}`
      )
    }
    const replayed = await this.add(originalQueue, dead.name, dead.data?.data ?? dead.data)
    await dead.remove()
    return replayed
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
