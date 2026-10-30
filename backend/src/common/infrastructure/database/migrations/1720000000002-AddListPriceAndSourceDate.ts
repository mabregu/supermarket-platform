import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Soporta el precio de lista (promociones) y la fecha de observacion de la fuente.
 *
 * - branch_products.listPrice  : precio de lista de SEPA (precioMax). Si es > currentPrice,
 *                                hay promocion activa.
 * - price_history.listPrice    : idem, congelado en el momento de la observacion.
 * - price_history.sourceDate   : cuando la fuente observo el precio (fecha del ticket, o
 *                                dia de publicacion de SEPA). Distinto de createdAt, que es
 *                                cuando NOSOTROS lo escribimos.
 */
export class AddListPriceAndSourceDate1720000000002 implements MigrationInterface {
  name = 'AddListPriceAndSourceDate1720000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "branch_products" ADD COLUMN IF NOT EXISTS "listPrice" numeric(12,2)`);
    await queryRunner.query(`ALTER TABLE "price_history" ADD COLUMN IF NOT EXISTS "listPrice" numeric(12,2)`);
    await queryRunner.query(`ALTER TABLE "price_history" ADD COLUMN IF NOT EXISTS "sourceDate" timestamptz`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "price_history" DROP COLUMN IF EXISTS "sourceDate"`);
    await queryRunner.query(`ALTER TABLE "price_history" DROP COLUMN IF EXISTS "listPrice"`);
    await queryRunner.query(`ALTER TABLE "branch_products" DROP COLUMN IF EXISTS "listPrice"`);
  }
}
