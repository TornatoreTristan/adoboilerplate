import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organization_user_roles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table
        .uuid('organization_id')
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE')

      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['user_id', 'organization_id', 'role_id'])
      table.index(['user_id', 'organization_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
