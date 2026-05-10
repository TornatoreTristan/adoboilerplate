import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table.uuid('organization_id').notNullable()
      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE')

      table.uuid('plan_id').notNullable()
      table.foreign('plan_id').references('id').inTable('plans').onDelete('RESTRICT')

      table.string('stripe_subscription_id').nullable().unique()
      table.string('stripe_customer_id').nullable()
      table.string('stripe_subscription_item_id').nullable()
      table.string('stripe_price_id').nullable()

      table.integer('quantity').notNullable().defaultTo(1)
      table.integer('user_count').notNullable().defaultTo(1)
      table.enum('billing_interval', ['month', 'year']).notNullable().defaultTo('month')
      table.decimal('price', 10, 2).notNullable().defaultTo(0)
      table.string('currency', 3).notNullable().defaultTo('EUR')

      table
        .enum('status', [
          'active',
          'canceled',
          'past_due',
          'trialing',
          'incomplete',
          'incomplete_expired',
          'paused',
        ])
        .notNullable()
        .defaultTo('active')

      table.timestamp('current_period_start').nullable()
      table.timestamp('current_period_end').nullable()
      table.timestamp('trial_ends_at').nullable()
      table.timestamp('canceled_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['organization_id'])
      table.index(['plan_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}