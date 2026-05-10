/*
|--------------------------------------------------------------------------
| Background-job processor registration
|--------------------------------------------------------------------------
|
| Imported only by `bin/worker.ts` so a single Bull processor never runs in
| the HTTP server. Add new processors here — keep one queue per concern so
| they retry / DLQ independently.
*/

import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type QueueService from '#shared/services/queue_service'
import sendEmailJob from '#mailing/jobs/send_email_job'
import logger from '@adonisjs/core/services/logger'

export function registerJobProcessors(): void {
  const queueService = getService<QueueService>(TYPES.QueueService)

  // Mailing — used by EmailService.queue()
  queueService.process('email', 'send-email', async (job, done) => {
    try {
      await sendEmailJob(job)
      done()
    } catch (err) {
      done(err instanceof Error ? err : new Error(String(err)))
    }
  })

  logger.info('[worker] Registered job processors: email/send-email')
}
