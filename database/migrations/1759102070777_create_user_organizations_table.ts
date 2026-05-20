// database/migrations/create_user_organizations_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_organizations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').references('users.id').onDelete('CASCADE').notNullable()
      table.uuid('organization_id').references('organizations.id').onDelete('CASCADE').notNullable()
      table.string('role').notNullable().defaultTo('member')
      table.timestamp('joined_at', { useTz: true }).notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['user_id', 'organization_id'])
    })

    // Add CHECK constraint for role values after table creation
    this.defer(async (db) => {
      await db.raw(
        `ALTER TABLE ${this.tableName} ADD CONSTRAINT user_organizations_role_check CHECK (role IN ('owner', 'admin', 'member', 'viewer'))`
      )
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
