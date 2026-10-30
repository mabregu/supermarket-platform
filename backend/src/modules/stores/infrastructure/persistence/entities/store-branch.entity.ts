import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { SupermarketEntity } from './supermarket.entity';
import { Point } from 'geojson';

@Entity('store_branches')
export class StoreBranchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  supermarketId: string;

  @ManyToOne(() => SupermarketEntity, (supermarket) => supermarket.branches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supermarketId' })
  supermarket: SupermarketEntity;

  @Column({ type: 'varchar', length: 150, nullable: false })
  branchName: string;

  /**
   * Identificador de la sucursal en la fuente oficial de precios (SEPA / Precios Claros).
   * Formato: "<comercio>-<bandera>-<sucursal>", ej. "15-1-163". Es la clave que
   * permite matchear la sucursal fisica con su catalogo de precios real.
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40, nullable: true })
  externalId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: false })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  city: string;

  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: false,
  })
  location: Point;

  @Column({ type: 'jsonb', nullable: true })
  openingHours: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
