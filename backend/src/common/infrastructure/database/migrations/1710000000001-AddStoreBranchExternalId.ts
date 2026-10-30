import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega `store_branches.externalId` para poder matchear una sucursal fisica con
 * su catalogo de precios oficial (SEPA). La columna es nullable y con indice
 * unico parcial: las sucursales de demo (sin externalId) siguen siendo validas.
 */
export class AddStoreBranchExternalId1710000000001 implements MigrationInterface {
  name = 'AddStoreBranchExternalId1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "store_branches" ADD COLUMN IF NOT EXISTS "externalId" varchar(40)`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_branches_external_id" ON "store_branches" ("externalId") WHERE "externalId" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_branches_external_id"`);
    await queryRunner.query(`ALTER TABLE "store_branches" DROP COLUMN IF EXISTS "externalId"`);
  }
}
