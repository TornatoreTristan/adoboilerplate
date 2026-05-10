import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class AuditPurge extends BaseCommand {
  static commandName = 'audit:purge'
  static description = 'Purge audit logs older than the configured retention period'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.number({ description: 'Override the retention period in days (default: env or 90)' })
  declare days?: number

  @flags.boolean({ description: 'Count rows that would be deleted without deleting them' })
  declare dryRun: boolean

  async run() {
    const { getService } = await import('#shared/container/container')
    const { TYPES } = await import('#shared/container/types')
    const AuditLogServiceModule = await import('#audit/services/audit_log_service')
    type AuditLogServiceType = InstanceType<typeof AuditLogServiceModule.default>

    const auditLogService = getService<AuditLogServiceType>(TYPES.AuditLogService)

    if (this.dryRun) {
      const { count, cutoffDays } = await auditLogService.countOldLogs(this.days)
      this.logger.info(
        `[dry-run] ${count} audit log(s) would be deleted (older than ${cutoffDays} days)`
      )
      return
    }

    const { purged, cutoffDays } = await auditLogService.purgeOldLogs(this.days)
    this.logger.info(`Purged ${purged} audit log(s) older than ${cutoffDays} days`)
  }
}
