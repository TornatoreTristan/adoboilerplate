import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'email_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table.uuid('user_id').references('users.id').onDelete('SET NULL').nullable()

      table.string('recipient').notNullable().index()
      table.string('subject').notNullable()
      table.string('category').notNullable().index()

      table
        .enum('status', [
          'pending',
          'sent',
          'delivered',
          'delivery_delayed',
          'bounced',
          'complained',
          'opened',
          'clicked',
          'failed',
          'received',
        ])
        .defaultTo('pending')
        .notNullable()
        .index()

      table.string('provider_id').nullable().index()
      table.text('error_message').nullable()

      table.integer('opens_count').defaultTo(0)
      table.integer('clicks_count').defaultTo(0)
      table.timestamp('opened_at').nullable()
      table.timestamp('clicked_at').nullable()

      table.json('metadata').nullable()
      table.json('attachments_metadata').nullable()

      table.json('bounce_data').nullable()
      table.json('complaint_data').nullable()

      table.timestamp('sent_at').nullable()
      table.timestamp('delivered_at').nullable()
      table.timestamp('failed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['status', 'category', 'created_at'])
      table.index(['user_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
