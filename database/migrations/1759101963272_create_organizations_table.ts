// database/migrations/create_organizations_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organizations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('name').notNullable()
      table.string('slug').unique().notNullable()
      table.jsonb('description_i18n').nullable()
      table.string('website').nullable()
      table.string('logo_url').nullable()
      table.string('email').nullable()
      table.string('phone').nullable()
      table.string('siret').nullable()
      table.string('vat_number').nullable()
      table.text('address').nullable()
      table.boolean('is_active').defaultTo(true)

      table.timestamp('deleted_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })

    // Add Full-Text Search support
    this.schema.raw(`
      ALTER TABLE ${this.tableName} ADD COLUMN search_vector tsvector;

      CREATE INDEX ${this.tableName}_search_idx ON ${this.tableName} USING GIN(search_vector);

      CREATE OR REPLACE FUNCTION ${this.tableName}_search_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('french', COALESCE(NEW.name, '')), 'A') ||
          setweight(to_tsvector('french', COALESCE(NEW.slug, '')), 'B') ||
          setweight(to_tsvector('french', COALESCE(NEW.description_i18n->>'fr', '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.description_i18n->>'en', '')), 'C') ||
          setweight(to_tsvector('french', COALESCE(NEW.email, '')), 'C') ||
          setweight(to_tsvector('french', COALESCE(NEW.address, '')), 'D');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER ${this.tableName}_search_update
      BEFORE INSERT OR UPDATE ON ${this.tableName}
      FOR EACH ROW EXECUTE FUNCTION ${this.tableName}_search_trigger();

      -- Populate existing data
      UPDATE ${this.tableName} SET search_vector =
        setweight(to_tsvector('french', COALESCE(name, '')), 'A') ||
        setweight(to_tsvector('french', COALESCE(slug, '')), 'B') ||
        setweight(to_tsvector('french', COALESCE(description_i18n->>'fr', '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(description_i18n->>'en', '')), 'C') ||
        setweight(to_tsvector('french', COALESCE(email, '')), 'C') ||
        setweight(to_tsvector('french', COALESCE(address, '')), 'D');
    `)
  }

  async down() {
    this.schema.raw(`
      DROP TRIGGER IF EXISTS ${this.tableName}_search_update ON ${this.tableName};
      DROP FUNCTION IF EXISTS ${this.tableName}_search_trigger();
      DROP INDEX IF EXISTS ${this.tableName}_search_idx;
    `)
    this.schema.dropTable(this.tableName)
  }
}
