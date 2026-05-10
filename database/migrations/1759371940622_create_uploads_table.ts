import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'uploads'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').references('users.id').onDelete('CASCADE').notNullable()

      table.string('filename').notNullable()
      table.string('storage_path').notNullable()
      table.enum('disk', ['local', 's3']).notNullable().defaultTo('local')
      table.string('mime_type').notNullable()
      table.bigInteger('size').notNullable()
      table.enum('visibility', ['public', 'private']).notNullable().defaultTo('private')

      // Polymorphique - Optionnel
      table.string('uploadable_type').nullable()
      table.uuid('uploadable_id').nullable()

      // Métadonnées additionnelles (width, height pour images, etc.)
      table.jsonb('metadata').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.timestamp('deleted_at').nullable()

      // Index pour performances
      table.index(['user_id'])
      table.index(['uploadable_type', 'uploadable_id'])
      table.index(['disk'])
      table.index(['visibility'])
      table.index(['deleted_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
