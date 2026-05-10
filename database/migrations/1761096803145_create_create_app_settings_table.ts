import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'app_settings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      // Application branding
      table.string('app_name').notNullable().defaultTo('My Application')
      table.uuid('logo_id').nullable() // Foreign key to uploads table
      table.uuid('favicon_id').nullable() // Foreign key to uploads table

      // Legal documents
      table.text('terms_of_service').nullable()
      table.text('terms_of_sale').nullable()
      table.text('privacy_policy').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    // Foreign keys
    this.schema.alterTable(this.tableName, (table) => {
      table.foreign('logo_id').references('id').inTable('uploads').onDelete('SET NULL')
      table.foreign('favicon_id').references('id').inTable('uploads').onDelete('SET NULL')
    })

    // Insérer une ligne par défaut (pattern singleton)
    this.defer(async (db) => {
      await db.table(this.tableName).insert({
        app_name: 'My Application',
        created_at: new Date(),
        updated_at: new Date(),
      })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
