import { inject, injectable } from 'inversify'
import { randomUUID } from 'node:crypto'
import type { Logger } from '@adonisjs/core/logger'
import { TYPES } from '#shared/container/types'
import type { MailDispatchResult, MailMessage, MailProvider } from './mail_provider.js'

@injectable()
export default class LogMailProvider implements MailProvider {
  readonly name = 'log'

  constructor(@inject(TYPES.Logger) private logger: Logger) {}

  async send(message: MailMessage): Promise<MailDispatchResult> {
    this.logger.info(
      {
        to: message.to,
        subject: message.subject,
        tags: message.tags,
      },
      '[MailProvider:log] email captured (not sent)'
    )

    return {
      id: `log_${randomUUID()}`,
    }
  }
}
