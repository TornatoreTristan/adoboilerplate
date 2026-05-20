import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_notification_preferences'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').references('users.id').onDelete('CASCADE').notNullable()

      table
        .enum('notification_type', [
          'user.mentioned',
          'org.invitation',
          'org.member_joined',
          'org.member_left',
          'system.announcement',
          'system.maintenance',
        ])
        .notNullable()

      table.enum('channel', ['in_app', 'email', 'push']).notNullable()
      table.boolean('enabled').defaultTo(true).notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()

      table.unique(['user_id', 'notification_type', 'channel'])
      table.index(['user_id'])
      table.index(['notification_type'])
      table.index(['channel'])
      table.index(['deleted_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
