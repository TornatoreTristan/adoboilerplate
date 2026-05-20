import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table.string('level', 20).notNullable().index()
      table.text('message').notNullable()
      table.jsonb('context').nullable()

      table.uuid('user_id').nullable().index()
      table.string('ip', 45).nullable()
      table.text('user_agent').nullable()
      table.string('method', 10).nullable()
      table.text('url').nullable()
      table.integer('status_code').nullable()

      table.timestamp('created_at').notNullable().defaultTo(this.now())

      table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL')
    })

    this.schema.raw(`
      CREATE INDEX logs_created_at_idx ON ${this.tableName} (created_at DESC);
    `)

    this.schema.raw(`
      ALTER TABLE ${this.tableName} ADD COLUMN search_vector tsvector;

      CREATE INDEX logs_search_idx ON ${this.tableName} USING GIN(search_vector);

      CREATE OR REPLACE FUNCTION logs_search_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('french', COALESCE(NEW.message, '')), 'A') ||
          setweight(to_tsvector('french', COALESCE(NEW.url, '')), 'B') ||
          setweight(to_tsvector('french', COALESCE(NEW.context::text, '')), 'C');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER logs_search_update
      BEFORE INSERT OR UPDATE ON ${this.tableName}
      FOR EACH ROW EXECUTE FUNCTION logs_search_trigger();
    `)
  }

  async down() {
    this.schema.raw(`
      DROP TRIGGER IF EXISTS logs_search_update ON ${this.tableName};
      DROP FUNCTION IF EXISTS logs_search_trigger();
      DROP INDEX IF EXISTS logs_search_idx;
      DROP INDEX IF EXISTS logs_created_at_idx;
    `)
    this.schema.dropTable(this.tableName)
  }
}
