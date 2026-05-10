import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Stored encrypted at rest via Lucid's encryption.encrypt() column
      // adapter (handled in the model). The raw secret is the otpauth shared
      // secret base32 used to derive TOTP codes.
      table.text('two_factor_secret').nullable()

      // True only after the user has confirmed setup with a valid TOTP code.
      // Until then, two_factor_secret may be present but unconfirmed and
      // login still proceeds normally.
      table.boolean('two_factor_enabled').notNullable().defaultTo(false)

      // Newline-separated single-use backup codes, also encrypted at rest
      // through the model's column adapter. Drained as the user consumes
      // them; regenerate flow rewrites this whole list.
      table.text('two_factor_backup_codes').nullable()

      // First-time confirmation timestamp — useful for audit trails and
      // for showing "2FA enabled since …" in account settings.
      table.timestamp('two_factor_confirmed_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('two_factor_secret')
      table.dropColumn('two_factor_enabled')
      table.dropColumn('two_factor_backup_codes')
      table.dropColumn('two_factor_confirmed_at')
    })
  }
}
