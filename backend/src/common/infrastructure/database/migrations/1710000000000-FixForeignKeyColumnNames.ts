import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repara el esquema de bases de datos creadas con la versión anterior, donde el
 * `@JoinColumn` usaba snake_case (`supermarket_id`) distinto del nombre de la
 * propiedad escalar (`supermarketId`). Esto generaba DOS columnas por relación:
 * una huérfana (camelCase) y otra con la FK real (snake_case) que nunca se
 * poblaba, rompiendo los JOIN.
 *
 * La migración renombra la columna real (snake_case) al nombre camelCase, pero
 * solo si la columna camelCase aún no existe (para no destruir datos). Si la
 * tabla no existe (base nueva), no hace nada.
 *
 * Para bases nuevas creadas vía `npm run seed` (synchronize) esta migración es
 * un no-op porque el esquema ya es correcto.
 */
export class FixForeignKeyColumnNames1710000000000 implements MigrationInterface {
  name = 'FixForeignKeyColumnNames1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_branches' AND column_name = 'supermarket_id')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_branches' AND column_name = 'supermarketId') THEN
          ALTER TABLE "store_branches" RENAME COLUMN supermarket_id TO "supermarketId";
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'categoryId') THEN
          ALTER TABLE "products" RENAME COLUMN category_id TO "categoryId";
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'brand_id')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'brandId') THEN
          ALTER TABLE "products" RENAME COLUMN brand_id TO "brandId";
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'parent_id')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'parentId') THEN
          ALTER TABLE "categories" RENAME COLUMN parent_id TO "parentId";
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branch_products' AND column_name = 'branch_id')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branch_products' AND column_name = 'branchId') THEN
          ALTER TABLE "branch_products" RENAME COLUMN branch_id TO "branchId";
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branch_products' AND column_name = 'product_id')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branch_products' AND column_name = 'productId') THEN
          ALTER TABLE "branch_products" RENAME COLUMN product_id TO "productId";
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_branches' AND column_name = 'supermarketId') THEN
          ALTER TABLE "store_branches" RENAME COLUMN "supermarketId" TO supermarket_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'categoryId') THEN
          ALTER TABLE "products" RENAME COLUMN "categoryId" TO category_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'brandId') THEN
          ALTER TABLE "products" RENAME COLUMN "brandId" TO brand_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'parentId') THEN
          ALTER TABLE "categories" RENAME COLUMN "parentId" TO parent_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branch_products' AND column_name = 'branchId') THEN
          ALTER TABLE "branch_products" RENAME COLUMN "branchId" TO branch_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branch_products' AND column_name = 'productId') THEN
          ALTER TABLE "branch_products" RENAME COLUMN "productId" TO product_id;
        END IF;
      END $$;
    `);
  }
}
