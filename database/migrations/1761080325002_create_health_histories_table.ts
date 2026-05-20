import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'health_history'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table.string('status', 20).notNullable().index()
      table.jsonb('health_data').notNullable()
      table.jsonb('metrics_data').notNullable()

      table.timestamp('created_at').notNullable().defaultTo(this.now())
    })

    this.schema.raw(`
      CREATE INDEX health_history_created_at_idx ON ${this.tableName} (created_at DESC);
    `)

    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT health_history_status_check CHECK (status IN ('ok', 'degraded', 'down'))`
    )
  }

  async down() {
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS health_history_status_check`
    )
    this.schema.dropTable(this.tableName)
  }
}
