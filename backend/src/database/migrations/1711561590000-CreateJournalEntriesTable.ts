import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJournalEntriesTable1711561590000
  implements MigrationInterface
{
  name = 'CreateJournalEntriesTable1711561590000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create journal_entries table
    await queryRunner.query(`
      CREATE TABLE "journal_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(200) NOT NULL,
        "content" jsonb NOT NULL,
        "user_id" uuid NOT NULL,
        "mood" character varying(50),
        "tags" jsonb,
        "is_content_encrypted" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_journal_entries" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_content_not_empty" CHECK (jsonb_array_length(content->'content') > 0)
      )
    `);

    // Create indexes for optimal query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_journal_entries_user_id" ON "journal_entries" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_journal_entries_created_at" ON "journal_entries" ("created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_journal_entries_updated_at" ON "journal_entries" ("updated_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_journal_entries_user_created" ON "journal_entries" ("user_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_journal_entries_user_updated" ON "journal_entries" ("user_id", "updated_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_journal_entries_title" ON "journal_entries" ("title")
    `);

    // Create GIN index for JSONB content searching
    await queryRunner.query(`
      CREATE INDEX "IDX_journal_entries_content_gin" ON "journal_entries" USING GIN ("content")
    `);

    // Create GIN index for tags array searching
    await queryRunner.query(`
      CREATE INDEX "IDX_journal_entries_tags_gin" ON "journal_entries" USING GIN ("tags")
    `);

    // Add foreign key constraint to users table
    await queryRunner.query(`
      ALTER TABLE "journal_entries" 
      ADD CONSTRAINT "FK_journal_entries_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Create additional constraints for data integrity
    await queryRunner.query(`
      ALTER TABLE "journal_entries" 
      ADD CONSTRAINT "CHK_title_not_empty" 
      CHECK (length(trim("title")) > 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "journal_entries" 
      ADD CONSTRAINT "CHK_content_is_valid_json" 
      CHECK ("content" ? 'type' AND "content" ? 'content')
    `);

    // Add comment to table for documentation
    await queryRunner.query(`
      COMMENT ON TABLE "journal_entries" IS 'Stores user journal entries with TipTap JSON content. Content may be encrypted for sensitive health data.'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "journal_entries"."content" IS 'TipTap editor content in JSON format. May be encrypted for sensitive health data.'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "journal_entries"."tags" IS 'Array of string tags for categorization'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "journal_entries"."is_content_encrypted" IS 'Indicates if the content is encrypted for additional security'
    `);

    // Create a view for journal statistics (useful for analytics)
    await queryRunner.query(`
      CREATE VIEW "journal_statistics" AS
      SELECT 
        "user_id",
        COUNT(*) as "total_entries",
        COUNT(CASE WHEN "mood" IS NOT NULL THEN 1 END) as "entries_with_mood",
        COUNT(CASE WHEN jsonb_array_length("tags") > 0 THEN 1 END) as "entries_with_tags",
        MIN("created_at") as "first_entry_date",
        MAX("created_at") as "last_entry_date",
        COUNT(CASE WHEN "is_content_encrypted" THEN 1 END) as "encrypted_entries"
      FROM "journal_entries"
      GROUP BY "user_id"
    `);

    // Create a function to update the updated_at timestamp automatically
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_journal_entry_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Create trigger to automatically update the updated_at field
    await queryRunner.query(`
      CREATE TRIGGER update_journal_entries_updated_at
        BEFORE UPDATE ON "journal_entries"
        FOR EACH ROW
        EXECUTE FUNCTION update_journal_entry_timestamp()
    `);

    // Create a function for full-text search in journal content
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION search_journal_content(
        p_user_id UUID,
        p_search_term TEXT
      )
      RETURNS TABLE(
        journal_id UUID,
        title VARCHAR(200),
        snippet TEXT,
        rank REAL
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          je.id,
          je.title,
          left(je.content::text, 200) as snippet,
          ts_rank(
            to_tsvector('english', je.title || ' ' || je.content::text),
            plainto_tsquery('english', p_search_term)
          ) as rank
        FROM journal_entries je
        WHERE je.user_id = p_user_id
          AND (
            to_tsvector('english', je.title || ' ' || je.content::text) @@ plainto_tsquery('english', p_search_term)
          )
        ORDER BY rank DESC, je.created_at DESC;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Grant necessary permissions (adjust based on your database roles)
    await queryRunner.query(`
      GRANT SELECT, INSERT, UPDATE, DELETE ON "journal_entries" TO app_patient;
    `);

    await queryRunner.query(`
      GRANT ALL PRIVILEGES ON "journal_entries" TO app_admin;
    `);

    await queryRunner.query(`
      GRANT SELECT ON "journal_statistics" TO app_patient, app_admin;
    `);

    await queryRunner.query(`
      GRANT EXECUTE ON FUNCTION search_journal_content(UUID, TEXT) TO app_patient, app_admin;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop permissions
    await queryRunner.query(`
      REVOKE ALL PRIVILEGES ON "journal_entries" FROM app_patient, app_admin;
    `);

    await queryRunner.query(`
      REVOKE ALL PRIVILEGES ON "journal_statistics" FROM app_patient, app_admin;
    `);

    await queryRunner.query(`
      REVOKE EXECUTE ON FUNCTION search_journal_content(UUID, TEXT) FROM app_patient, app_admin;
    `);

    // Drop functions
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS search_journal_content(UUID, TEXT)`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_journal_entry_timestamp()`,
    );

    // Drop trigger
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON "journal_entries"`,
    );

    // Drop view
    await queryRunner.query(`DROP VIEW IF EXISTS "journal_statistics"`);

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "journal_entries" DROP CONSTRAINT "FK_journal_entries_user"
    `);

    // Drop check constraints
    await queryRunner.query(`
      ALTER TABLE "journal_entries" DROP CONSTRAINT IF EXISTS "CHK_content_not_empty"
    `);

    await queryRunner.query(`
      ALTER TABLE "journal_entries" DROP CONSTRAINT IF EXISTS "CHK_title_not_empty"
    `);

    await queryRunner.query(`
      ALTER TABLE "journal_entries" DROP CONSTRAINT IF EXISTS "CHK_content_is_valid_json"
    `);

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_journal_entries_tags_gin"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_journal_entries_content_gin"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_journal_entries_title"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_journal_entries_user_updated"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_journal_entries_user_created"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_journal_entries_updated_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_journal_entries_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_journal_entries_user_id"`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE "journal_entries"`);
  }
}
