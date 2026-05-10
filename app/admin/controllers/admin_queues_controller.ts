import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import QueueService from '#shared/services/queue_service'
import { AdminQueueDtoPresenter } from '#admin/presenters/admin_queue_dto'
import { asInertiaProps } from '#shared/types/inertia_props'
import { E } from '#shared/exceptions/exception_helpers'

@inject()
export default class AdminQueuesController {
  constructor(private queueService: QueueService) {}

  async index({ inertia }: HttpContext) {
    const queues = this.queueService.listQueues()

    const queuesWithStats = await Promise.all(
      queues.map(async (queueMeta) => {
        const [stats, isPaused] = await Promise.all([
          this.queueService.getQueueStats(queueMeta.name),
          this.resolveIsPaused(queueMeta.name),
        ])
        return AdminQueueDtoPresenter.presentQueue(queueMeta, isPaused, stats)
      })
    )

    return inertia.render(
      'admin/queues/index',
      asInertiaProps({
        queues: queuesWithStats,
      })
    )
  }

  async show({ params, inertia }: HttpContext) {
    const queueName = params.name
    const knownQueues = this.queueService.listQueues()
    const queueMeta = knownQueues.find((q) => q.name === queueName)

    if (!queueMeta) {
      E.queueNotFound(queueName)
    }

    const [stats, failedJobsRaw, isPaused] = await Promise.all([
      this.queueService.getQueueStats(queueName),
      this.queueService.getFailedJobs(queueName, 50),
      this.resolveIsPaused(queueName),
    ])

    return inertia.render(
      'admin/queues/show',
      asInertiaProps({
        queue: AdminQueueDtoPresenter.presentQueue(queueMeta, isPaused, stats),
        failedJobs: failedJobsRaw.map((job) => AdminQueueDtoPresenter.presentFailedJob(job)),
      })
    )
  }

  async retry({ params, response, session, i18n }: HttpContext) {
    const { name, id } = params

    try {
      await this.queueService.retryFailedJob(name, id)
      session.flash('success', i18n.t('admin.queues.flash.job_retried'))
    } catch (error) {
      session.flash('error', error.message)
    }

    return response.redirect().back()
  }

  async remove({ params, response, session, i18n }: HttpContext) {
    const { name, id } = params

    try {
      await this.queueService.removeFailedJob(name, id)
      session.flash('success', i18n.t('admin.queues.flash.job_removed'))
    } catch (error) {
      session.flash('error', error.message)
    }

    return response.redirect().back()
  }

  async pause({ params, response, session, i18n }: HttpContext) {
    const { name } = params

    try {
      await this.queueService.pauseQueue(name)
      session.flash('success', i18n.t('admin.queues.flash.queue_paused'))
    } catch (error) {
      session.flash('error', error.message)
    }

    return response.redirect().back()
  }

  async resume({ params, response, session, i18n }: HttpContext) {
    const { name } = params

    try {
      await this.queueService.resumeQueue(name)
      session.flash('success', i18n.t('admin.queues.flash.queue_resumed'))
    } catch (error) {
      session.flash('error', error.message)
    }

    return response.redirect().back()
  }

  private async resolveIsPaused(name: string): Promise<boolean> {
    try {
      const queue = this.queueService.getQueue(name)
      return queue.isPaused()
    } catch {
      return false
    }
  }
}
