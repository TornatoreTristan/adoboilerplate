import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('full_name').nullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').nullable()

      // OAuth fields
      table.string('google_id').nullable().unique()
      table.text('avatar_url').nullable()

      // Validation
      table.timestamp('email_verified_at', { useTz: true }).nullable()

      // Communication preferences
      table.boolean('newsletter_enabled').defaultTo(true).notNullable()
      table.boolean('tips_enabled').defaultTo(false).notNullable()
      table.boolean('promotional_offers_enabled').defaultTo(false).notNullable()

      // Locale preference (used for emails, UI fallback)
      table.string('locale', 2).notNullable().defaultTo('fr')

      // 2FA — secret + backup codes are encrypted at rest via the model's
      // column adapter (Lucid encryption.encrypt). two_factor_enabled stays
      // false until the user confirms setup with a valid TOTP code.
      table.text('two_factor_secret').nullable()
      table.boolean('two_factor_enabled').notNullable().defaultTo(false)
      table.text('two_factor_backup_codes').nullable()
      table.timestamp('two_factor_confirmed_at', { useTz: true }).nullable()

      // Soft delete
      table.timestamp('deleted_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.schema.raw(`
      ALTER TABLE ${this.tableName}
      ADD CONSTRAINT users_locale_check CHECK (locale IN ('fr', 'en'))
    `)

    // Add Full-Text Search support
    this.schema.raw(`
      ALTER TABLE ${this.tableName} ADD COLUMN search_vector tsvector;

      CREATE INDEX ${this.tableName}_search_idx ON ${this.tableName} USING GIN(search_vector);

      CREATE OR REPLACE FUNCTION ${this.tableName}_search_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('french', COALESCE(NEW.full_name, '')), 'A') ||
          setweight(to_tsvector('french', COALESCE(NEW.email, '')), 'B');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER ${this.tableName}_search_update
      BEFORE INSERT OR UPDATE ON ${this.tableName}
      FOR EACH ROW EXECUTE FUNCTION ${this.tableName}_search_trigger();

      -- Populate existing data
      UPDATE ${this.tableName} SET search_vector =
        setweight(to_tsvector('french', COALESCE(full_name, '')), 'A') ||
        setweight(to_tsvector('french', COALESCE(email, '')), 'B');
    `)
  }

  async down() {
    this.schema.raw(`
      ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS users_locale_check;
      DROP TRIGGER IF EXISTS ${this.tableName}_search_update ON ${this.tableName};
      DROP FUNCTION IF EXISTS ${this.tableName}_search_trigger();
      DROP INDEX IF EXISTS ${this.tableName}_search_idx;
    `)
    this.schema.dropTable(this.tableName)
  }
}
