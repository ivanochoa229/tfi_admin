import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthColumns1700000000000 implements MigrationInterface {
  name = 'AddAuthColumns1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA || 'db_tfi';

    // Garantiza que toda esta migración use el esquema correcto
    await queryRunner.query(`SET search_path TO "${schema}", public`);

    await queryRunner.query(`
      ALTER TABLE "${schema}"."empleado"
        ADD COLUMN IF NOT EXISTS "correo_electronico" VARCHAR(120),
        ADD COLUMN IF NOT EXISTS "telefono" VARCHAR(30),
        ADD COLUMN IF NOT EXISTS "password" VARCHAR(120)
    `);

    // Índice único sobre correo en el esquema correcto
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_empleado_correo"
      ON "${schema}"."empleado" ("correo_electronico")
    `);

    await queryRunner.query(`
      ALTER TABLE "${schema}"."evolucion_tarea"
        ADD COLUMN IF NOT EXISTS "descripcion_cambio" VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA || 'db_tfi';

    await queryRunner.query(`SET search_path TO "${schema}", public`);

    await queryRunner.query(`
      ALTER TABLE "${schema}"."evolucion_tarea"
        DROP COLUMN IF EXISTS "descripcion_cambio"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "${schema}"."idx_empleado_correo"
    `);

    await queryRunner.query(`
      ALTER TABLE "${schema}"."empleado"
        DROP COLUMN IF EXISTS "correo_electronico",
        DROP COLUMN IF EXISTS "telefono",
        DROP COLUMN IF EXISTS "password"
    `);
  }
}
