import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').references('users.id').onDelete('CASCADE').notNullable()
      table.uuid('organization_id').references('organizations.id').onDelete('CASCADE').nullable()

      table.string('type').notNullable()
      table.enum('priority', ['low', 'normal', 'high', 'urgent']).defaultTo('normal').notNullable()
      table.jsonb('title_i18n').notNullable()
      table.jsonb('message_i18n').notNullable()
      table.jsonb('data').nullable()
      table.jsonb('actions').nullable()

      table.timestamp('read_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()

      table.index(['user_id', 'read_at'])
      table.index(['organization_id'])
      table.index(['type'])
      table.index(['priority'])
      table.index(['deleted_at'])
    })

    // Add Full-Text Search support
    this.schema.raw(`
      ALTER TABLE ${this.tableName} ADD COLUMN search_vector tsvector;

      CREATE INDEX ${this.tableName}_search_idx ON ${this.tableName} USING GIN(search_vector);

      CREATE OR REPLACE FUNCTION ${this.tableName}_search_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('french', COALESCE(NEW.title_i18n->>'fr', '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.title_i18n->>'en', '')), 'A') ||
          setweight(to_tsvector('french', COALESCE(NEW.message_i18n->>'fr', '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.message_i18n->>'en', '')), 'B') ||
          setweight(to_tsvector('french', COALESCE(NEW.type, '')), 'C');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER ${this.tableName}_search_update
      BEFORE INSERT OR UPDATE ON ${this.tableName}
      FOR EACH ROW EXECUTE FUNCTION ${this.tableName}_search_trigger();

      -- Populate existing data
      UPDATE ${this.tableName} SET search_vector =
        setweight(to_tsvector('french', COALESCE(title_i18n->>'fr', '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(title_i18n->>'en', '')), 'A') ||
        setweight(to_tsvector('french', COALESCE(message_i18n->>'fr', '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(message_i18n->>'en', '')), 'B') ||
        setweight(to_tsvector('french', COALESCE(type, '')), 'C');
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
