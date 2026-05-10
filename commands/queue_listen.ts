import { BaseCommand } from '@adonisjs/core/ace'
import { type CommandOptions } from '@adonisjs/core/types/ace'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type QueueService from '#shared/services/queue_service'

/**
 * Long-running worker process. Run from a separate Coolify (or systemd, or
 * pm2) service alongside the web one so a crash on one side never takes
 * the other down.
 *
 *   $ node ace queue:listen
 *   $ npm run worker        # alias defined in package.json
 *
 * Job processors are registered centrally in `start/jobs.ts` — add new
 * queues there, never inside this command.
 */
export default class QueueListen extends BaseCommand {
  static commandName = 'queue:listen'
  static description = 'Start the Bull worker process and register all job processors'

  static options: CommandOptions = {
    startApp: true,
    staysAlive: true,
  }

  async run() {
    this.logger.info('▶️  Starting Bull worker...')

    const { registerJobProcessors } = await import('#start/jobs')
    registerJobProcessors()

    const cleanup = async () => {
      this.logger.info('⏹️  Worker shutting down — closing Bull connections')
      try {
        const queueService = getService<QueueService>(TYPES.QueueService)
        await queueService.closeAll()
      } catch (err) {
        this.logger.error(`Cleanup failed: ${err instanceof Error ? err.message : err}`)
      } finally {
        await this.app.terminate()
      }
    }

    this.app.listen('SIGTERM', cleanup)
    this.app.listen('SIGINT', cleanup)

    this.logger.success('✅ Worker ready — listening for jobs')
  }
}
