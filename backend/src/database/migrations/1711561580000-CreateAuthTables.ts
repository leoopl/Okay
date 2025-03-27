import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthTables1711561580000 implements MigrationInterface {
  name = 'CreateAuthTables1711561580000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create refresh tokens table
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token" text NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked" boolean NOT NULL DEFAULT false,
        "revoked_by_ip" character varying,
        "replaced_by_token" character varying,
        "created_by_ip" character varying,
        "user_agent" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id")
      )
    `);

    // Create index on user_id and expiration date for faster queries
    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at")
    `);

    // Create token blacklist table
    await queryRunner.query(`
      CREATE TABLE "token_blacklist" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "jti" character varying NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_token_blacklist" PRIMARY KEY ("id")
      )
    `);

    // Create unique index on JWT ID to prevent duplicates
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_token_blacklist_jti" ON "token_blacklist" ("jti")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_token_blacklist_expires_at" ON "token_blacklist" ("expires_at")
    `);

    // Create authorization codes table for PKCE
    await queryRunner.query(`
      CREATE TABLE "authorization_codes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" text NOT NULL,
        "user_id" uuid NOT NULL,
        "client_id" character varying NOT NULL,
        "redirect_uri" character varying NOT NULL,
        "scope" character varying,
        "code_challenge" character varying NOT NULL,
        "code_challenge_method" character varying NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "used" boolean NOT NULL DEFAULT false,
        "used_by_ip" character varying,
        "created_by_ip" character varying,
        "user_agent" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_authorization_codes" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for authorization codes
    await queryRunner.query(`
      CREATE INDEX "IDX_authorization_codes_code" ON "authorization_codes" ("code")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_authorization_codes_user_id" ON "authorization_codes" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_authorization_codes_expires_at" ON "authorization_codes" ("expires_at")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" 
      ADD CONSTRAINT "FK_refresh_tokens_users" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "authorization_codes" 
      ADD CONSTRAINT "FK_authorization_codes_users" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "authorization_codes" DROP CONSTRAINT "FK_authorization_codes_users"
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_users"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_authorization_codes_expires_at"`);
    await queryRunner.query(`DROP INDEX "IDX_authorization_codes_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_authorization_codes_code"`);
    await queryRunner.query(`DROP INDEX "IDX_token_blacklist_expires_at"`);
    await queryRunner.query(`DROP INDEX "IDX_token_blacklist_jti"`);
    await queryRunner.query(`DROP INDEX "IDX_refresh_tokens_expires_at"`);
    await queryRunner.query(`DROP INDEX "IDX_refresh_tokens_user_id"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "authorization_codes"`);
    await queryRunner.query(`DROP TABLE "token_blacklist"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
