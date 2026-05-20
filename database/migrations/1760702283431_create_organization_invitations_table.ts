import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organization_invitations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table.string('email').notNullable()
      table.uuid('organization_id').references('organizations.id').onDelete('CASCADE').notNullable()
      table.uuid('invited_by_id').references('users.id').onDelete('SET NULL').nullable()
      table.string('role').notNullable().defaultTo('member')
      table.string('token').unique().notNullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('accepted_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['email', 'organization_id'])
      table.index(['token'])
      table.index(['organization_id'])
    })

    this.defer(async (db) => {
      await db.raw(
        `ALTER TABLE ${this.tableName} ADD CONSTRAINT organization_invitations_role_check CHECK (role IN ('owner', 'admin', 'member', 'viewer'))`
      )
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
