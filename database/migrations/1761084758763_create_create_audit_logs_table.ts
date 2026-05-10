import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      // User who performed the action (nullable for system actions)
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL')

      // Organization context (nullable)
      table
        .uuid('organization_id')
        .nullable()
        .references('id')
        .inTable('organizations')
        .onDelete('SET NULL')

      // Action performed (e.g., 'user.created', 'login.success', 'organization.updated')
      table.string('action', 100).notNullable().index()

      // Resource affected
      table.string('resource_type', 50).nullable().index() // e.g., 'User', 'Organization'
      table.string('resource_id', 255).nullable()

      // Request context
      table.string('ip_address', 45).nullable() // IPv6 max length
      table.text('user_agent').nullable()

      // Additional metadata (old values, new values, etc.)
      table.jsonb('metadata').nullable()

      // Timestamps (immutable logs - no updated_at)
      table.timestamp('created_at', { useTz: true }).notNullable()
    })

    // Add Full-Text Search support
    this.schema.raw(`
      -- Add search vector column
      ALTER TABLE ${this.tableName} ADD COLUMN search_vector tsvector;

      -- Create GIN index for fast full-text search
      CREATE INDEX ${this.tableName}_search_idx ON ${this.tableName} USING GIN(search_vector);

      -- Create trigger function to auto-update search_vector
      CREATE OR REPLACE FUNCTION ${this.tableName}_search_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('french', COALESCE(NEW.action, '')), 'A') ||
          setweight(to_tsvector('french', COALESCE(NEW.resource_type, '')), 'B') ||
          setweight(to_tsvector('french', COALESCE(NEW.metadata::text, '')), 'C') ||
          setweight(to_tsvector('french', COALESCE(NEW.ip_address, '')), 'D');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;

      -- Attach trigger to table
      CREATE TRIGGER ${this.tableName}_search_update
      BEFORE INSERT OR UPDATE ON ${this.tableName}
      FOR EACH ROW EXECUTE FUNCTION ${this.tableName}_search_trigger();

      -- Populate existing data (none yet, but for consistency)
      UPDATE ${this.tableName} SET search_vector =
        setweight(to_tsvector('french', COALESCE(action, '')), 'A') ||
        setweight(to_tsvector('french', COALESCE(resource_type, '')), 'B') ||
        setweight(to_tsvector('french', COALESCE(metadata::text, '')), 'C') ||
        setweight(to_tsvector('french', COALESCE(ip_address, '')), 'D');
    `)
  }

  async down() {
    // Drop trigger and function first
    this.schema.raw(`
      DROP TRIGGER IF EXISTS ${this.tableName}_search_update ON ${this.tableName};
      DROP FUNCTION IF EXISTS ${this.tableName}_search_trigger();
      DROP INDEX IF EXISTS ${this.tableName}_search_idx;
    `)

    this.schema.dropTable(this.tableName)
  }
}
