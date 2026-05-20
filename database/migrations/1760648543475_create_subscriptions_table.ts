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
          'unpaid',
        ])
        .notNullable()
        .defaultTo('active')

      table.timestamp('current_period_start', { useTz: true }).nullable()
      table.timestamp('current_period_end', { useTz: true }).nullable()
      table.timestamp('trial_ends_at', { useTz: true }).nullable()
      table.timestamp('canceled_at', { useTz: true }).nullable()

      table.timestamp('deleted_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['organization_id'])
      table.index(['plan_id'])
      table.index(['status'])
      table.index(['stripe_subscription_id'])
      table.index(['stripe_customer_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
