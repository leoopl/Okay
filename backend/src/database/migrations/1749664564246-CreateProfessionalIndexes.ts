import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProfessionalIndexes1699999999999
  implements MigrationInterface
{
  name = 'CreateProfessionalIndexes1699999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create individual indexes for basic filtering (if not already exist)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_professionals_atende_sus" 
      ON "professionals" ("profissional_atende_sus")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_professionals_cbo" 
      ON "professionals" ("profissional_cbo")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_professionals_municipio" 
      ON "professionals" ("municipio")
    `);

    // Create composite index for common filter combinations
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_professionals_composite_filters" 
      ON "professionals" ("municipio", "profissional_cbo", "profissional_atende_sus")
    `);

    // Create text search optimized indexes using GIN for better ILIKE performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_professionals_nome_fantasia_text" 
      ON "professionals" USING GIN (to_tsvector('portuguese', "nome_fantasia"))
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_professionals_profissional_nome_text" 
      ON "professionals" USING GIN (to_tsvector('portuguese', "profissional_nome"))
    `);

    // Create index for location search
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_professionals_logradouro_text" 
      ON "professionals" USING GIN (to_tsvector('portuguese', "logradouro"))
    `);

    // Create traditional BTREE indexes for ILIKE queries (fallback)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_professionals_nome_fantasia_btree" 
      ON "professionals" ("nome_fantasia" text_pattern_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_professionals_profissional_nome_btree" 
      ON "professionals" ("profissional_nome" text_pattern_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_professionals_logradouro_btree" 
      ON "professionals" ("logradouro" text_pattern_ops)
    `);

    // Create index for efficient pagination ordering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_professionals_id_pagination" 
      ON "professionals" ("id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all created indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_professionals_atende_sus"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_professionals_cbo"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_professionals_municipio"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_professionals_composite_filters"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_professionals_nome_fantasia_text"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_professionals_profissional_nome_text"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_professionals_logradouro_text"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_professionals_nome_fantasia_btree"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_professionals_profissional_nome_btree"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_professionals_logradouro_btree"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_professionals_id_pagination"`,
    );
  }
}
