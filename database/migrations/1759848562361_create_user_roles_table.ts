import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_roles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table
        .string('role_slug')
        .notNullable()
        .references('slug')
        .inTable('roles')
        .onDelete('CASCADE')

      table.timestamp('granted_at', { useTz: true }).notNullable()

      table.unique(['user_id', 'role_slug'])
      table.index(['user_id'])
      table.index(['role_slug'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
