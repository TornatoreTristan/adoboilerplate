import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'stripe_webhook_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      // Stripe delivers at-least-once; this column is the deduplication key.
      table.text('event_id').notNullable().unique()

      table.text('event_type').notNullable()

      table.timestamp('processed_at', { useTz: true }).notNullable().defaultTo(this.raw('now()'))

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
