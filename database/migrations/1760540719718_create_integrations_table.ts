import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'integrations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('provider').notNullable().unique() // stripe, paypal, etc.
      table.boolean('is_active').defaultTo(false)
      table.text('config').nullable() // AES-encrypted config — contains API keys and secrets
      table.jsonb('metadata').nullable() // Additional non-sensitive data (no secrets)

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
