import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class CheckInvitations extends BaseCommand {
  static commandName = 'check:invitations'
  static description = 'Check recent invitations and email logs'

  static options: CommandOptions = {}

  async run() {
    this.logger.info('🔍 Checking recent invitations and email logs...\n')

    const { default: db } = await import('@adonisjs/lucid/services/db')

    const invitations = await db
      .from('organization_invitations')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(5)

    this.logger.info('📨 Last 5 invitations:')
    if (invitations.length === 0) {
      this.logger.warning('  No invitations found')
    } else {
      invitations.forEach((inv) => {
        this.logger.info(
          `  - ${inv.email} (${inv.role}) - Created: ${inv.created_at} - Accepted: ${inv.accepted_at || 'Pending'}`
        )
      })
    }

    this.logger.info('\n📧 Last 10 email logs:')
    const emailLogs = await db
      .from('email_logs')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(10)

    if (emailLogs.length === 0) {
      this.logger.warning('  No email logs found')
    } else {
      emailLogs.forEach((log) => {
        const status = log.status === 'sent' ? '✅' : log.status === 'failed' ? '❌' : '⏳'
        this.logger.info(
          `  ${status} ${log.recipient} - ${log.subject} - ${log.status}${log.error_message ? ` (${log.error_message})` : ''}`
        )
      })
    }
  }
}
